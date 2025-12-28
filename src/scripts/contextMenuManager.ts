/**
 * Context Menu Manager
 * Handles right-click menu and long-press on mobile
 */

let longPressTimer: number | null = null;
let longPressTarget: HTMLElement | null = null;
const LONG_PRESS_DURATION = 500; // ms

/**
 * Shows context menu at position
 */
function showContextMenu(x: number, y: number): void {
  const menu = document.getElementById('context-menu');
  if (!menu) return;

  // Position menu
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
 * Hides context menu
 */
export function hideContextMenu(): void {
  const menu = document.getElementById('context-menu');
  if (menu) {
    menu.style.display = 'none';
  }
}

/**
 * Handles context menu actions
 */
function handleMenuAction(action: string): void {
  hideContextMenu();

  switch (action) {
    case 'refresh':
      window.location.reload();
      break;
    case 'settings':
      alert('Ustawienia - wkrótce!');
      break;
  }
}

/**
 * Start long press detection
 */
function startLongPress(e: TouchEvent): void {
  const target = e.target as HTMLElement;

  // Don't show menu on interactive elements
  if (
    target.closest('.window') ||
    target.closest('.taskbar') ||
    target.closest('.desktop-icon') ||
    target.closest('.start-menu')
  ) {
    return;
  }

  longPressTarget = target;

  longPressTimer = window.setTimeout(() => {
    const touch = e.touches[0];
    if (touch) {
      // Haptic feedback if available
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

  // Right-click (desktop only)
  desktop.addEventListener('contextmenu', (e) => {
    const target = e.target as HTMLElement;

    // Don't show menu on interactive elements
    if (
      target.closest('.window') ||
      target.closest('.taskbar') ||
      target.closest('.desktop-icon') ||
      target.closest('.start-menu')
    ) {
      return;
    }

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
    const menu = document.getElementById('context-menu');
    if (menu && !menu.contains(e.target as Node)) {
      hideContextMenu();
    }
  });

  document.addEventListener('touchstart', (e) => {
    const menu = document.getElementById('context-menu');
    if (menu && menu.style.display === 'block' && !menu.contains(e.target as Node)) {
      hideContextMenu();
    }
  });

  // Menu item clicks
  const menu = document.getElementById('context-menu');
  if (menu) {
    menu.querySelectorAll('.menu-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        const action = (item as HTMLElement).dataset.action;
        if (action) {
          handleMenuAction(action);
        }
      });
    });
  }
}
