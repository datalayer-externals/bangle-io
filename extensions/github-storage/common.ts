import type { BangleApplicationStore } from '@bangle.io/api';
import { notification, SliceKey } from '@bangle.io/api';
import { Severity } from '@bangle.io/constants';
import { acquireLockIfAvailable } from '@bangle.io/utils';

export const EXTENSION_NAME = '@bangle.io/github-storage';

export const GITHUB_STORAGE_PROVIDER_NAME = 'github-storage';

export const OPERATION_NEW_GITHUB_WORKSPACE =
  'operation::@bangle.io/github-storage:new-workspace';

export const OPERATION_UPDATE_GITHUB_TOKEN =
  'operation::@bangle.io/github-storage:update-github-token';

export const OPERATION_SYNC_GITHUB_CHANGES =
  'operation::@bangle.io/github-storage:sync-github-changes';

export const OPERATION_DISCARD_LOCAL_CHANGES =
  'operation::@bangle.io/github-storage:OPERATION_DISCARD_LOCAL_CHANGES';

export const OPERATION_SHOW_CONFLICT_DIALOG =
  'operation::@bangle.io/github-storage:show-conflict-dialog';

export const OPERATION_OPTIMIZE_GITHUB_STORAGE =
  'operation::@bangle.io/github-storage:OPERATION_OPTIMIZE_GITHUB_STORAGE';

export const DISCARD_LOCAL_CHANGES_DIALOG =
  'dialog::@bangle.io/github-storage:discard-local-changes';

export const NEW_GITHUB_WORKSPACE_TOKEN_DIALOG =
  'dialog::@bangle.io/github-storage:NEW_GITHUB_WORKSPACE_TOKEN_DIALOG';

export const NEW_GITHUB_WORKSPACE_REPO_PICKER_DIALOG =
  'dialog::@bangle.io/github-storage:NEW_GITHUB_WORKSPACE_REPO_PICKER_DIALOG';

export const UPDATE_GITHUB_TOKEN_DIALOG =
  'dialog::@bangle.io/github-storage:UPDATE_GITHUB_TOKEN_DIALOG';

export const CONFLICT_DIALOG = 'dialog::@bangle.io/github-storage:conflict';

export const ghSliceKey = new SliceKey<
  {
    isSyncing: boolean;
    githubWsName: string | undefined;
    conflictedWsPaths: string[];
  },
  | {
      name: 'action::@bangle.io/github-storage:UPDATE_SYNC_STATE';
      value: {
        isSyncing: boolean;
      };
    }
  | {
      name: 'action::@bangle.io/github-storage:SET_CONFLICTED_WS_PATHS';
      value: {
        conflictedWsPaths: string[];
      };
    }
  | {
      name: 'action::@bangle.io/github-storage:UPDATE_GITHUB_WS_NAME';
      value: {
        githubWsName: string | undefined;
      };
    }
  | {
      name: 'action::@bangle.io/github-storage:RESET_GITHUB_STATE';
      value: {};
    }
>('slice::@bangle.io/github-storage:slice-key');

export const LOCK_NAME = '@bangle.io/github-storage:sync-lock';

export interface GithubWsMetadata {
  owner: string;
  branch: string;
}

export async function getGithubSyncLockWrapper<
  R extends (...args: any[]) => Promise<any>,
>(
  wsName: string,
  cb: R,
): Promise<
  | {
      lockAcquired: true;
      result: Awaited<ReturnType<R>>;
    }
  | {
      lockAcquired: false;
      result: undefined;
    }
> {
  let releaseLock = await acquireLockIfAvailable(LOCK_NAME + ':' + wsName);

  if (!releaseLock) {
    return { lockAcquired: false, result: undefined };
  }

  try {
    let result = await cb();

    return {
      lockAcquired: true,
      result,
    };
  } finally {
    await releaseLock();
  }
}

export const getSyncInterval = () => 5 * 1000 * 60;

export function notify(
  store: BangleApplicationStore,
  title: string,
  severity: Severity,
  content?: string,
) {
  return notification.notificationSliceKey.callOp(
    store.state,
    store.dispatch,
    notification.showNotification({
      severity,
      title,
      uid: 'sync notification-' + Math.random(),
      transient: severity !== Severity.ERROR,
      content,
    }),
  );
}
