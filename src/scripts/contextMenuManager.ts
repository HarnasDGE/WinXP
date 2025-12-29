/**
 * Context Menu Manager
 * Handles right-click menu and long-press on mobile
 */

import { createFolder, renameFolder, deleteFolder } from './folderManager';
import { openWindow } from './windowManager';

let longPressTimer: number | null = null;
let longPressTarget: HTMLElement | null = null;
let contextMenuJustShown = false;
const LONG_PRESS_DURATION = 500; // ms

/**
 * Shows desktop context menu at position
 */
function showContextMenu(x: number, y: number): void {
  hideAllMenus();
  const menu = document.getElementById('context-menu');
  if (!menu) return;

  positionMenu(menu, x, y);
  // Don't set flag for desktop menu - only for icon menu
}

/**
 * Shows icon context menu at position
 */
function showIconContextMenu(x: number, y: number, iconId: string): void {
  hideAllMenus();
  const menu = document.getElementById('icon-context-menu');
  if (!menu) return;

  menu.dataset.targetId = iconId;
  positionMenu(menu, x, y);

  // Set flag to prevent immediate click from opening window
  contextMenuJustShown = true;
  setTimeout(() => {
    contextMenuJustShown = false;
  }, 300);
}

/**
 * Check if context menu was just shown
 */
export function wasContextMenuJustShown(): boolean {
  return contextMenuJustShown;
}

/**
 * Position a menu at coordinates, adjusting for screen bounds
 */
function positionMenu(menu: HTMLElement, x: number, y: number): void {
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.style.display = 'block';

  // Adjust if menu goes off screen
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) {
    menu.style.left = `${window.innerWidth - rect.width - 10}px`;
  }
  if (rect.bottom > window.innerHeight) {
    menu.style.top = `${window.innerHeight - rect.height - 10}px`;
  }
}

/**
 * Hides all context menus
 */
export function hideAllMenus(): void {
  const desktopMenu = document.getElementById('context-menu');
  const iconMenu = document.getElementById('icon-context-menu');

  if (desktopMenu) desktopMenu.style.display = 'none';
  if (iconMenu) iconMenu.style.display = 'none';
}

/**
 * Handles desktop context menu actions
 */
function handleMenuAction(action: string): void {
  hideAllMenus();

  switch (action) {
    case 'new-folder':
      const name = prompt('Nazwa folderu:');
      if (name) {
        createFolder(name);
      }
      break;
    case 'refresh':
      window.location.reload();
      break;
    case 'settings':
      alert('Ustawienia - wkrótce!');
      break;
  }
}

/**
 * Handles icon context menu actions
 */
function handleIconMenuAction(action: string, iconId: string): void {
  hideAllMenus();

  switch (action) {
    case 'open':
      openWindow(iconId);
      break;
    case 'rename':
      const currentLabel = document.querySelector(`[data-window-id="${iconId}"] .icon-label`)?.textContent;
      const newName = prompt('Nowa nazwa:', currentLabel || '');
      if (newName) {
        renameFolder(iconId, newName);
      }
      break;
    case 'delete':
      if (confirm('Czy na pewno chcesz usunąć ten folder?')) {
        deleteFolder(iconId);
      }
      break;
  }
}

/**
 * Start long press detection
 */
function startLongPress(e: TouchEvent): void {
  const target = e.target as HTMLElement;

  // Check if pressing on desktop icon
  const iconEl = target.closest('.desktop-icon') as HTMLElement;
  if (iconEl) {
    const iconId = iconEl.dataset.windowId;
    if (!iconId) return;

    longPressTarget = iconEl;
    longPressTimer = window.setTimeout(() => {
      const touch = e.touches[0];
      if (touch && navigator.vibrate) {
        navigator.vibrate(50);
      }
      showIconContextMenu(touch.clientX, touch.clientY, iconId);
    }, LONG_PRESS_DURATION);
    return;
  }

  // Don't show menu on other interactive elements
  if (
    target.closest('.window') ||
    target.closest('.taskbar') ||
    target.closest('.start-menu')
  ) {
    return;
  }

  // Desktop long press
  longPressTarget = target;
  longPressTimer = window.setTimeout(() => {
    const touch = e.touches[0];
    if (touch) {
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      showContextMenu(touch.clientX, touch.clientY);
    }
  }, LONG_PRESS_DURATION);
}

/**
 * Cancel long press
 */
function cancelLongPress(): void {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  longPressTarget = null;
}

/**
 * Initialize context menu manager
 */
export function initContextMenuManager(): void {
  const desktop = document.querySelector('.desktop');
  if (!desktop) return;

  // Right-click handler
  desktop.addEventListener('contextmenu', (e) => {
    const target = e.target as HTMLElement;

    // Check if right-clicking on desktop icon
    const iconEl = target.closest('.desktop-icon') as HTMLElement;
    if (iconEl) {
      const iconId = iconEl.dataset.windowId;
      if (iconId) {
        e.preventDefault();
        showIconContextMenu(e.clientX, e.clientY, iconId);
      }
      return;
    }

    // Don't show menu on other interactive elements
    if (
      target.closest('.window') ||
      target.closest('.taskbar') ||
      target.closest('.start-menu')
    ) {
      return;
    }

    // Show desktop context menu
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY);
  });

  // Long press (mobile)
  desktop.addEventListener('touchstart', startLongPress, { passive: true });
  desktop.addEventListener('touchend', cancelLongPress);
  desktop.addEventListener('touchcancel', cancelLongPress);
  desktop.addEventListener('touchmove', cancelLongPress);

  // Click outside to close
  document.addEventListener('click', (e) => {
    const desktopMenu = document.getElementById('context-menu');
    const iconMenu = document.getElementById('icon-context-menu');

    if (desktopMenu && !desktopMenu.contains(e.target as Node) &&
        iconMenu && !iconMenu.contains(e.target as Node)) {
      hideAllMenus();
    }
  });

  document.addEventListener('touchstart', (e) => {
    const desktopMenu = document.getElementById('context-menu');
    const iconMenu = document.getElementById('icon-context-menu');

    const isMenuOpen = (desktopMenu?.style.display === 'block') ||
                       (iconMenu?.style.display === 'block');

    if (isMenuOpen &&
        !desktopMenu?.contains(e.target as Node) &&
        !iconMenu?.contains(e.target as Node)) {
      hideAllMenus();
    }
  });

  // Desktop menu item clicks
  const desktopMenu = document.getElementById('context-menu');
  if (desktopMenu) {
    desktopMenu.querySelectorAll('.menu-item').forEach((item) => {
      item.addEventListener('click', () => {
        const action = (item as HTMLElement).dataset.action;
        if (action) {
          handleMenuAction(action);
        }
      });
    });
  }

  // Icon menu item clicks
  const iconMenu = document.getElementById('icon-context-menu');
  if (iconMenu) {
    iconMenu.querySelectorAll('.menu-item').forEach((item) => {
      item.addEventListener('click', () => {
        const action = (item as HTMLElement).dataset.action;
        const iconId = iconMenu.dataset.targetId;
        if (action && iconId) {
          handleIconMenuAction(action, iconId);
        }
      });
    });
  }
}
