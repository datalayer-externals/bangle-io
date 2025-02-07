import { wsPathHelpers } from '@bangle.io/api';
import { LocalFileEntry, RemoteFileEntry } from '@bangle.io/remote-file-sync';
import type { BaseStorageProvider, StorageOpts } from '@bangle.io/storage';
import { BaseError, errorParse, errorSerialize } from '@bangle.io/utils';

import type { GithubWsMetadata } from './common';
import { GITHUB_STORAGE_PROVIDER_NAME } from './common';
import { getGhToken } from './database';
import { GITHUB_STORAGE_NOT_ALLOWED, INVALID_GITHUB_TOKEN } from './errors';
import { fileEntryManager } from './file-entry-manager';
import { getFileBlobFromTree, getRepoTree } from './github-api-helpers';

const LOG = false;
const log = LOG
  ? console.debug.bind(console, 'github-storage-provider')
  : () => {};

export class GithubStorageProvider implements BaseStorageProvider {
  name = GITHUB_STORAGE_PROVIDER_NAME;
  displayName = 'Github storage';
  description = '';
  hidden = true;

  private _getTree = getRepoTree();

  async createFile(
    wsPath: string,
    file: File,
    opts: StorageOpts,
  ): Promise<void> {
    const entry = (
      await LocalFileEntry.newFile({
        uid: wsPath,
        file,
      })
    ).toPlainObj();
    // TODO we should throw error if file already exists?
    const success = await fileEntryManager.createEntry(entry);
  }

  async deleteFile(wsPath: string, opts: StorageOpts): Promise<void> {
    // TODO: currently if a local entry does not exist
    // we donot mark it for deletion. We should do that.
    await fileEntryManager.softDeleteEntry(wsPath);
  }

  async fileExists(wsPath: string, opts: StorageOpts): Promise<boolean> {
    return Boolean(await this.readFile(wsPath, opts));
  }

  async fileStat(wsPath: string, opts: StorageOpts) {
    throw new BaseError({
      message: 'fileStat is not supported',
      code: GITHUB_STORAGE_NOT_ALLOWED,
    });

    return {} as any;
  }

  async listAllFiles(
    abortSignal: AbortSignal,
    wsName: string,
    opts: StorageOpts,
  ): Promise<string[]> {
    const wsMetadata = (await opts.readWorkspaceMetadata(
      wsName,
    )) as GithubWsMetadata;

    const githubToken = await getGhToken();

    if (!githubToken) {
      throw new BaseError({
        message: 'Github token is required',
        code: INVALID_GITHUB_TOKEN,
      });
    }

    // TODO querying files from github sometimes can result in `Git Repository is empty.` base error
    // lets make sure we can retry it.
    const { tree } = await this._getTree({
      wsName,
      config: { repoName: wsName, ...wsMetadata, githubToken },
      abortSignal,
    });

    let allKeys = await fileEntryManager.listAllKeys(wsName);
    let softDeletedKeys = new Set(
      await fileEntryManager.listSoftDeletedKeys(wsName),
    );

    return Array.from(new Set([...allKeys, ...tree.keys()])).filter((key) => {
      return !softDeletedKeys.has(key);
    });
  }

  async newWorkspaceMetadata(wsName: string, createOpts: any) {
    if (!createOpts.owner) {
      throw new BaseError({
        message: 'Github owner is required',
        code: INVALID_GITHUB_TOKEN,
      });
    }

    return {
      owner: createOpts.owner,
      branch: createOpts.branch,
    };
  }

  parseError(errorString: string) {
    try {
      return errorParse(JSON.parse(errorString));
    } catch (error) {
      return undefined;
    }
  }

  async readFile(wsPath: string, opts: StorageOpts): Promise<File | undefined> {
    const { wsName } = wsPathHelpers.resolvePath(wsPath);

    // check if file exists in local db
    const plainObj = await fileEntryManager.readEntry(wsPath);

    if (plainObj?.deleted) {
      return undefined;
    }
    if (plainObj) {
      return plainObj.file;
    }

    // if we reach here, file doesn't exist locally
    // so we fetch from github and create a local entry
    const wsMetadata = (await opts.readWorkspaceMetadata(
      wsName,
    )) as GithubWsMetadata;

    const remoteFileEntry = await (
      await this._makeGetRemoteFileEntryCb(wsMetadata)
    )(wsPath);

    if (!remoteFileEntry) {
      return undefined;
    }

    const createSuccess = await fileEntryManager.createEntry(
      remoteFileEntry.forkLocalFileEntry().toPlainObj(),
    );

    if (createSuccess) {
      return remoteFileEntry.file;
    }

    return undefined;
  }

  async renameFile(
    wsPath: string,
    newWsPath: string,
    opts: StorageOpts,
  ): Promise<void> {
    const file = await this.readFile(wsPath, opts);

    if (!file) {
      throw new BaseError({
        message: 'Cannot rename as file not found',
        code: GITHUB_STORAGE_NOT_ALLOWED,
      });
    }

    await this.createFile(newWsPath, file, opts);
    await this.deleteFile(wsPath, opts);
  }

  serializeError(error: Error) {
    return JSON.stringify(errorSerialize(error));
  }

  async writeFile(
    wsPath: string,
    file: File,
    opts: StorageOpts,
    sha?: string,
  ): Promise<void> {
    log('writeFile', wsPath, file);

    let result = await fileEntryManager.writeFile(wsPath, file, sha);

    // TODO write a test to make sure error is thrown if file is not found
    if (!result) {
      throw new BaseError({
        message: `File ${wsPath} not found`,
        code: GITHUB_STORAGE_NOT_ALLOWED,
      });
    }
  }

  private async _makeGetRemoteFileEntryCb(
    wsMetadata: GithubWsMetadata,
    abortSignal: AbortSignal = new AbortController().signal,
  ) {
    const githubToken = await getGhToken();

    if (!githubToken) {
      throw new BaseError({
        message: 'Github token is required',
        code: INVALID_GITHUB_TOKEN,
      });
    }

    return async (wsPath: string): Promise<RemoteFileEntry | undefined> => {
      const { wsName } = wsPathHelpers.resolvePath(wsPath, true);

      const config = {
        repoName: wsName,
        ...wsMetadata,
        githubToken,
      };

      const tree = await this._getTree({
        wsName,
        config,
        abortSignal,
      });
      const file = await getFileBlobFromTree({
        wsPath,
        config,
        abortSignal,
        tree,
      });

      if (!file) {
        return undefined;
      }

      return RemoteFileEntry.newFile({
        uid: wsPath,
        file: file,
        deleted: undefined,
      });
    };
  }
}
