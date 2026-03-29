import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(
      target.closest(
        'input, textarea, select, option, [contenteditable="true"], [data-allow-copy="true"]',
      ),
    )
  );
}

function applyProtectedMediaAttributes() {
  document.querySelectorAll('img, video').forEach((element) => {
    element.setAttribute('draggable', 'false');
  });
}

export function StorefrontContentProtectionManager() {
  const location = useLocation();
  const isStorefrontRoute = !location.pathname.startsWith('/admin');

  useEffect(() => {
    const htmlElement = document.documentElement;
    const bodyElement = document.body;

    if (!isStorefrontRoute) {
      htmlElement.removeAttribute('data-content-protected');
      bodyElement.removeAttribute('data-content-protected');
      return;
    }

    htmlElement.setAttribute('data-content-protected', 'true');
    bodyElement.setAttribute('data-content-protected', 'true');
    applyProtectedMediaAttributes();

    const observer = new MutationObserver(() => {
      applyProtectedMediaAttributes();
    });

    observer.observe(bodyElement, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      htmlElement.removeAttribute('data-content-protected');
      bodyElement.removeAttribute('data-content-protected');
    };
  }, [isStorefrontRoute, location.pathname]);

  useEffect(() => {
    if (!isStorefrontRoute) {
      return;
    }

    const handleContextMenu = (event: MouseEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    };

    const handleDragStart = (event: DragEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('img, video, picture, canvas, svg')
      ) {
        event.preventDefault();
      }
    };

    const handleSelectStart = (event: Event) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      event.preventDefault();
    };

    const handleClipboardEvent = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      event.preventDefault();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const hasShortcutModifier = event.ctrlKey || event.metaKey;
      const isDevtoolsShortcut =
        hasShortcutModifier && event.shiftKey && ['i', 'j', 'c'].includes(key);
      const isBlockedGlobalShortcut =
        key === 'f12' || (hasShortcutModifier && ['s', 'p', 'u'].includes(key));
      const isBlockedCopyShortcut =
        hasShortcutModifier && ['c', 'x'].includes(key) && !isEditableTarget(event.target);

      if (!isDevtoolsShortcut && !isBlockedGlobalShortcut && !isBlockedCopyShortcut) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('dragstart', handleDragStart, true);
    document.addEventListener('selectstart', handleSelectStart, true);
    document.addEventListener('copy', handleClipboardEvent, true);
    document.addEventListener('cut', handleClipboardEvent, true);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('dragstart', handleDragStart, true);
      document.removeEventListener('selectstart', handleSelectStart, true);
      document.removeEventListener('copy', handleClipboardEvent, true);
      document.removeEventListener('cut', handleClipboardEvent, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isStorefrontRoute]);

  return null;
}
