import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import {
  PRIMARY_EDITOR_INDEX,
  SECONDARY_EDITOR_INDEX,
} from '@bangle.io/constants';
import type { EditorIdType } from '@bangle.io/shared-types';

import {
  createNewNote,
  createWorkspace,
  ctrlKey,
  getPrimaryEditorHandler,
  waitForEditorFocus,
} from '../helpers';

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  await page.goto(baseURL!, { waitUntil: 'networkidle' });
});

const isEditorBarFocused = async (page: Page, editorId: EditorIdType) => {
  return Boolean(
    await page.$(
      `.B-editor-container_editor-container-${editorId} .B-activitybar_editorbar-wrapper  > .BU_active`,
    ),
  );
};

const waitForEditorBarFocused = async (page: Page, editorId: EditorIdType) => {
  await page
    .locator(
      `.B-editor-container_editor-container-${editorId} .B-activitybar_editorbar-wrapper  > .BU_active`,
    )
    .waitFor();
};

test('shows currently focused editor', async ({ page }) => {
  const wsName = await createWorkspace(page);
  await createNewNote(page, wsName, 'test123');

  await page.keyboard.down(ctrlKey);
  await page.keyboard.press('\\');
  await page.keyboard.up(ctrlKey);

  // split screen auto focuses on the second (secondary) editor
  await waitForEditorFocus(page, SECONDARY_EDITOR_INDEX);

  // wait for the focus action to be dispatched

  await waitForEditorBarFocused(page, SECONDARY_EDITOR_INDEX);

  expect(await isEditorBarFocused(page, PRIMARY_EDITOR_INDEX)).toBe(false);
  expect(await isEditorBarFocused(page, SECONDARY_EDITOR_INDEX)).toBe(true);

  // Focus on first editor
  await getPrimaryEditorHandler(page, { focus: true });

  await waitForEditorBarFocused(page, PRIMARY_EDITOR_INDEX);

  expect(await isEditorBarFocused(page, PRIMARY_EDITOR_INDEX)).toBe(true);
  expect(await isEditorBarFocused(page, SECONDARY_EDITOR_INDEX)).toBe(false);
});
