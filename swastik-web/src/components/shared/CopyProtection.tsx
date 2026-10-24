'use client';

import { useEffect } from 'react';

const EDITABLE_SELECTOR =
  'input, textarea, select, [contenteditable="true"], [contenteditable=""], [data-copy-allowed]';

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(EDITABLE_SELECTOR));
}

export function CopyProtection() {
  useEffect(() => {
    const preventBrowserCopy = (event: Event) => {
      if (!isEditableTarget(event.target)) {
        event.preventDefault();
      }
    };

    const preventKeyboardCopy = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        (event.key.toLowerCase() === 'c' || event.key.toLowerCase() === 'x') &&
        !isEditableTarget(event.target)
      ) {
        event.preventDefault();
      }
    };

    document.addEventListener('copy', preventBrowserCopy, true);
    document.addEventListener('cut', preventBrowserCopy, true);
    document.addEventListener('selectstart', preventBrowserCopy, true);
    document.addEventListener('dragstart', preventBrowserCopy, true);
    document.addEventListener('contextmenu', preventBrowserCopy, true);
    document.addEventListener('keydown', preventKeyboardCopy, true);

    return () => {
      document.removeEventListener('copy', preventBrowserCopy, true);
      document.removeEventListener('cut', preventBrowserCopy, true);
      document.removeEventListener('selectstart', preventBrowserCopy, true);
      document.removeEventListener('dragstart', preventBrowserCopy, true);
      document.removeEventListener('contextmenu', preventBrowserCopy, true);
      document.removeEventListener('keydown', preventKeyboardCopy, true);
    };
  }, []);

  return null;
}
