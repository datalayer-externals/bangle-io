import React from 'react';

import { keyDisplayValue } from '@bangle.io/utils';

export function PrettyKeybinding({ rawKey }: { rawKey: string }) {
  let format = keyDisplayValue(rawKey).split('-');

  return (
    <span
      className="inline B-ui-components_pretty-keybinding"
      style={{ color: 'var(--BV-text-color-1)' }}
    >
      {format.map((r, i) => (
        <kbd
          key={i}
          className="px-1 font-sans capitalize rounded-sm B-ui-components_pretty-keybinding-kbd"
        >
          {r}
        </kbd>
      ))}
    </span>
  );
}
