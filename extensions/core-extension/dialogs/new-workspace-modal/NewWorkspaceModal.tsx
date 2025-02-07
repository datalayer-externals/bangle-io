import React, { useCallback, useEffect, useReducer, useRef } from 'react';

import { useSerialOperationContext, workspace } from '@bangle.io/api';
import { useBangleStoreContext } from '@bangle.io/bangle-store-context';
import {
  CORE_OPERATIONS_CREATE_BROWSER_WORKSPACE,
  CORE_OPERATIONS_CREATE_NATIVE_FS_WORKSPACE,
  NEW_WORKSPACE_DIALOG_NAME,
} from '@bangle.io/constants';
import { useUIManagerContext } from '@bangle.io/slice-ui';
import { Dialog } from '@bangle.io/ui-components';
import { useDebouncedValue } from '@bangle.io/utils';

import { PickStorageDirectory, WorkspaceNameInput } from './Buttons';
import type { WorkspaceCreateErrorTypes, WorkspaceStorageType } from './common';
import {
  BROWSER,
  defaultStorageType,
  FILE_SYSTEM,
  INVALID_WORKSPACE_NAME_ERROR,
  WORKSPACE_NAME_ALREADY_EXISTS_ERROR,
} from './common';
import { ShowError } from './ShowError';
import { StorageTypeDropdown } from './StorageTypeDropdown';

interface ModalState {
  defaultStorageType: WorkspaceStorageType;
  error: WorkspaceCreateErrorTypes | undefined;
  workspace: WorkspaceType;
}

type WorkspaceType =
  | { type: typeof FILE_SYSTEM; rootDir?: FileSystemDirectoryHandle }
  | { type: typeof BROWSER; wsName?: string };

type ModalStateAction =
  | { type: 'update_storage_type'; storageType: WorkspaceStorageType }
  | { type: 'update_workspace'; workspace: WorkspaceType }
  | { type: 'update_error'; error: WorkspaceCreateErrorTypes | undefined }
  | { type: 'reset' };

const modalReducer = (
  state: ModalState,
  action: ModalStateAction,
): ModalState => {
  switch (action.type) {
    case 'update_storage_type':
      return {
        ...state,
        error: undefined,
        workspace: { type: action.storageType },
      };
    case 'update_workspace':
      return { ...state, workspace: action.workspace, error: undefined };
    case 'update_error':
      return { ...state, error: action.error };

    case 'reset':
      return {
        error: undefined,
        defaultStorageType: state.defaultStorageType,
        workspace: {
          type: state.defaultStorageType,
        },
      };
  }
};

export function NewWorkspaceModal() {
  const [modalState, updateModalState] = useReducer(modalReducer, {
    error: undefined,
    defaultStorageType: defaultStorageType,
    workspace: {
      type: defaultStorageType,
    },
  });

  const bangleStore = useBangleStoreContext();

  const { dispatch } = useUIManagerContext();
  const { dispatchSerialOperation } = useSerialOperationContext();

  const storageType = modalState.workspace.type;

  const updateStorageType = useCallback((val: WorkspaceStorageType) => {
    updateModalState({ type: 'update_storage_type', storageType: val });
  }, []);

  const updateInputWorkspaceName = useCallback((value) => {
    updateModalState({
      type: 'update_workspace',
      workspace: { type: BROWSER, wsName: value },
    });
  }, []);

  const errorType = modalState.error;

  const setError = useCallback((value?: WorkspaceCreateErrorTypes) => {
    updateModalState({
      type: 'update_error',
      error: value,
    });
  }, []);

  const updateRootDirHandle = useCallback(
    (value: FileSystemDirectoryHandle | undefined) => {
      updateModalState({
        type: 'update_workspace',
        workspace: { type: FILE_SYSTEM, rootDir: value },
      });
    },
    [],
  );

  const newWorkspaceName = getWorkspaceName(modalState);
  const debouncedNewWorkspaceName = useDebouncedValue(newWorkspaceName, {
    wait: 150,
    maxWait: 300,
  });

  const createWorkspace = useCallback(() => {
    if (isCreateDisabled(modalState)) {
      return;
    }

    switch (modalState.workspace.type) {
      case FILE_SYSTEM: {
        dispatchSerialOperation({
          name: CORE_OPERATIONS_CREATE_NATIVE_FS_WORKSPACE,
          value: { rootDirHandle: modalState.workspace.rootDir },
        });
        break;
      }

      case BROWSER: {
        dispatchSerialOperation({
          name: CORE_OPERATIONS_CREATE_BROWSER_WORKSPACE,
          value: { wsName: modalState.workspace.wsName },
        });
        break;
      }
    }

    dispatch({
      name: 'action::@bangle.io/slice-ui:DISMISS_DIALOG',
      value: {
        dialogName: NEW_WORKSPACE_DIALOG_NAME,
      },
    });
  }, [dispatchSerialOperation, modalState, dispatch]);

  const onDismiss = useCallback(() => {
    dispatch({
      name: 'action::@bangle.io/slice-ui:DISMISS_DIALOG',
      value: {
        dialogName: NEW_WORKSPACE_DIALOG_NAME,
      },
    });
  }, [dispatch]);

  // set error if wsName already exists
  useEffect(() => {
    let destroyed = false;

    if (debouncedNewWorkspaceName) {
      (async () => {
        if (destroyed) {
          return;
        }
        const existingWorkspace = await workspace.readWorkspaceInfo(
          debouncedNewWorkspaceName,
        );

        if (destroyed) {
          return;
        }

        if (existingWorkspace) {
          setError(WORKSPACE_NAME_ALREADY_EXISTS_ERROR);
        } else if (errorType === WORKSPACE_NAME_ALREADY_EXISTS_ERROR) {
          setError(undefined);
        }
      })();
    }

    return () => {
      destroyed = true;
    };
  }, [bangleStore, debouncedNewWorkspaceName, errorType, setError]);

  useEffect(() => {
    if (newWorkspaceName) {
      if (newWorkspaceName.includes(':')) {
        setError(INVALID_WORKSPACE_NAME_ERROR);
      } else if (errorType === INVALID_WORKSPACE_NAME_ERROR) {
        setError(undefined);
      }
    }
  }, [newWorkspaceName, setError, errorType]);

  return (
    <Dialog
      isDismissable
      headingTitle="New Workspace"
      onDismiss={onDismiss}
      size="medium"
      primaryButtonConfig={{
        disabled: isCreateDisabled(modalState),
        onPress: createWorkspace,
        text: 'Create workspace',
      }}
    >
      {errorType && (
        <div className="mb-5">
          <ShowError errorType={errorType} closeModal={onDismiss} />
        </div>
      )}
      <div className="flex flex-col mb-5">
        <div className="mb-2">
          <h2 className="text-lg font-medium">Storage type</h2>
          <span className="text-sm" style={{ color: 'var(--BV-text-color-1)' }}>
            Bangle.io strongly recommends you choose <b>File system</b> storage
            because it is safer and portable. Read more at{' '}
            <a href="https://bangle.io/" className="underline">
              https://bangle.io
            </a>
            .
          </span>
        </div>
        <div>
          <StorageTypeDropdown
            storageType={storageType}
            updateStorageType={updateStorageType}
          />
        </div>
      </div>
      {storageType === FILE_SYSTEM && (
        <div className="flex flex-col mb-5">
          <PickStorageDirectory
            setError={setError}
            dirName={modalState.workspace.rootDir?.name}
            updateRootDirHandle={updateRootDirHandle}
          />
        </div>
      )}
      {storageType === BROWSER && (
        <div className="flex flex-col mb-5">
          <WorkspaceNameInput
            // prevent changing the name when using other name browser
            isDisabled={modalState.workspace.type !== BROWSER}
            value={newWorkspaceName}
            updateValue={updateInputWorkspaceName}
            onPressEnter={
              isCreateDisabled(modalState) ? undefined : createWorkspace
            }
          />
        </div>
      )}
    </Dialog>
  );
}

function getWorkspaceName(modal: ModalState): string | undefined {
  switch (modal.workspace.type) {
    case FILE_SYSTEM: {
      return modal.workspace.rootDir?.name;
    }
    case BROWSER: {
      return modal.workspace.wsName;
    }
  }

  return undefined;
}

function isCreateDisabled(modal: ModalState): boolean {
  if (modal.error) {
    return true;
  }

  switch (modal.workspace.type) {
    case FILE_SYSTEM: {
      return !Boolean(modal.workspace.rootDir);
    }
    case BROWSER: {
      return !Boolean(modal.workspace.wsName);
    }
  }

  return true;
}
