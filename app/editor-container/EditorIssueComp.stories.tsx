import './style';

import type { Story } from '@storybook/react';
import React from 'react';

import { Severity } from '@bangle.io/constants';
import { createBasicStore, TestStoreProvider } from '@bangle.io/test-utils';

import { EditorIssueComp } from './EditorIssueComp';

export default {
  title: 'editor-container/EditorIssueComp',
  component: EditorIssueComp,
  argTypes: {},
};

const Template: Story<Parameters<typeof EditorIssueComp>[0]> = (args) => {
  const { store } = createBasicStore({
    storageProvider: 'in-memory',
    useUISlice: true,
    useEditorManagerSlice: true,
  });

  return (
    <TestStoreProvider bangleStore={store} bangleStoreChanged={0}>
      <div style={{ width: 400 }}>
        <EditorIssueComp {...args}></EditorIssueComp>
      </div>
    </TestStoreProvider>
  );
};

export const Vanilla = Template.bind({});

Vanilla.args = {
  editorIssue: {
    title: 'This is a test',
    severity: Severity.ERROR,
    serialOperation: 'operation::something',
    uid: '123',
    description: 'something went wrong',
    wsPath: 'test:one.md',
  },
  onPress: () => {},
};
