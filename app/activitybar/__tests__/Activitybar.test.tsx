/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import type { SidebarType } from '@bangle.io/extension-registry';
import { Extension } from '@bangle.io/extension-registry';
import { changeSidebar } from '@bangle.io/slice-ui';
import type { TestInitialSliceStateOverride } from '@bangle.io/test-utils';
import { createBasicTestStore, TestStoreProvider } from '@bangle.io/test-utils';

import { Activitybar } from '../Activitybar';

jest.mock('@bangle.io/slice-ui', () => {
  const otherThings = jest.requireActual('@bangle.io/slice-ui');

  return {
    ...otherThings,
    changeSidebar: jest.fn(() => () => {}),
  };
});

let changeSidebarMock = changeSidebar as jest.MockedFunction<
  typeof changeSidebar
>;

const changeSidebarRet = jest.fn();
changeSidebarMock.mockImplementation(() => changeSidebarRet);

const createStoreWithSidebar = ({
  override,
  sidebar,
}: {
  override?: TestInitialSliceStateOverride;
  sidebar?: SidebarType;
} = {}) => {
  return createBasicTestStore({
    extensions: [
      Extension.create({
        name: 'test-ext-123',
        application: {
          sidebars: sidebar ? [sidebar] : undefined,
        },
      }),
    ],
    useEditorManagerSlice: true,
    useUISlice: true,
    overrideInitialSliceState: {
      ...override,
      uiSlice: {
        widescreen: true,
        ...override?.uiSlice,
      },
    },
  });
};

test('renders when no sidebars', () => {
  let { store } = createStoreWithSidebar();

  let result = render(
    <div>
      <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
        <Activitybar></Activitybar>
      </TestStoreProvider>
    </div>,
  );

  expect(result.container).toMatchSnapshot();
});

test('renders when there is sidebar', () => {
  let { store } = createStoreWithSidebar({
    sidebar: {
      name: 'sidebar::test-ext-123:sidebar-123',
      title: 'search notes',
      activitybarIcon: <span>test-search-icon</span>,
      ReactComponent: () => <p>search notes</p>,
      hint: 'test-search-hint',
    },
  });

  let result = render(
    <div>
      <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
        <Activitybar />
      </TestStoreProvider>
    </div>,
  );

  expect(result.container.innerHTML).toContain('test-search-icon');
  expect(result.container).toMatchSnapshot();
  expect(result.container.innerHTML).not.toContain('BU_is-active');
});

test('renders when sidebar is active', () => {
  let { store } = createStoreWithSidebar({
    override: {
      uiSlice: {
        sidebar: 'sidebar::test-ext-123:sidebar-123',
      },
    },
    sidebar: {
      name: 'sidebar::test-ext-123:sidebar-123',
      title: 'search notes',
      activitybarIcon: <span>test-search-icon</span>,
      ReactComponent: () => <p>search notes</p>,
      hint: 'test-search-hint',
    },
  });

  let result = render(
    <div>
      <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
        <Activitybar></Activitybar>
      </TestStoreProvider>
    </div>,
  );

  expect(result.container).toMatchSnapshot();
  expect(result.container.innerHTML).toContain('BU_is-active');
});

test('inactive sidebar is dispatched correctly', () => {
  let { store } = createStoreWithSidebar({
    override: {
      uiSlice: {
        sidebar: undefined,
      },
    },
    sidebar: {
      name: 'sidebar::test-ext-123:sidebar-123',
      title: 'search notes',
      activitybarIcon: <span>test-search-icon</span>,
      ReactComponent: () => <p>search notes</p>,
      hint: 'test-search-hint',
    },
  });

  let result = render(
    <div>
      <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
        <Activitybar></Activitybar>
      </TestStoreProvider>
    </div>,
  );
  act(() => {
    fireEvent.click(result.getByRole('button', { name: 'test-search-hint' }));
  });

  expect(changeSidebarMock).toBeCalledTimes(1);
  expect(changeSidebarMock).nthCalledWith(
    1,
    'sidebar::test-ext-123:sidebar-123',
  );
});

test('active sidebar is toggled off correctly', () => {
  let { store } = createStoreWithSidebar({
    override: {
      uiSlice: {
        sidebar: 'sidebar::test-ext-123:sidebar-123',
      },
    },
    sidebar: {
      name: 'sidebar::test-ext-123:sidebar-123',
      title: 'search notes',
      activitybarIcon: <span>test-search-icon</span>,
      ReactComponent: () => <p>search notes</p>,
      hint: 'test-search-hint',
    },
  });

  let result = render(
    <div>
      <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
        <Activitybar></Activitybar>
      </TestStoreProvider>
    </div>,
  );
  act(() => {
    fireEvent.click(result.getByRole('button', { name: 'test-search-hint' }));
  });

  expect(changeSidebarMock).toBeCalledTimes(1);
  expect(changeSidebarMock).nthCalledWith(
    1,
    'sidebar::test-ext-123:sidebar-123',
  );
});

test('activitybarIconShow is respected', async () => {
  let activitybarIconShow = jest.fn(() => false);

  let { store } = createStoreWithSidebar({
    override: {
      uiSlice: {
        sidebar: 'sidebar::test-ext-123:sidebar-123',
      },
    },
    sidebar: {
      name: 'sidebar::test-ext-123:sidebar-123',
      title: 'search notes',
      activitybarIcon: <span>test-search-icon</span>,
      ReactComponent: () => <p>search notes</p>,
      hint: 'test-search-hint',
      activitybarIconShow,
    },
  });
  let { rerender } = render(
    <div>
      <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
        <Activitybar></Activitybar>
      </TestStoreProvider>
    </div>,
  );

  expect(screen.queryAllByLabelText('test-search-hint')).toEqual([]);

  activitybarIconShow.mockImplementation(() => true);

  let { store: newStore } = createStoreWithSidebar({
    override: {
      uiSlice: {
        sidebar: 'sidebar::test-ext-123:sidebar-123',
      },
    },
    sidebar: {
      name: 'sidebar::test-ext-123:sidebar-123',
      title: 'search notes',
      activitybarIcon: <span>test-search-icon</span>,
      ReactComponent: () => <p>search notes</p>,
      hint: 'test-search-hint',
      activitybarIconShow,
    },
  });

  rerender(
    <div>
      <TestStoreProvider bangleStore={newStore} bangleStoreChanged={1}>
        <Activitybar></Activitybar>
      </TestStoreProvider>
    </div>,
  );

  expect(screen.queryAllByLabelText('test-search-hint')).toMatchInlineSnapshot(`
    [
      <button
        aria-label="test-search-hint"
        class="w-full py-3 rounded-sm flex justify-center B-activitybar_button BU_widescreen  B-ui-bangle-button_button p-1  transition-all duration-100 animate-on-press BU_is-active is-quiet "
        type="button"
      >
        <span
          class=" w-7 h-7 "
        >
          test-search-icon
        </span>
      </button>,
    ]
  `);
});
