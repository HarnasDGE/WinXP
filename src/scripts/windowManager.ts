/**
 * Window Manager
 * Handles window opening, closing, dragging, and focus management
 */

import { wasContextMenuJustShown } from './contextMenuManager';

let highestZIndex = 200;
let activeWindow: HTMLElement | null = null;

// Dragging state
let isDragging = false;
let currentWindow: HTMLElement | null = null;
let offsetX = 0;
let offsetY = 0;

// Resizing state
let isResizing = false;
let resizeDirection: string | null = null;
let resizeStartX = 0;
let resizeStartY = 0;
let resizeStartWidth = 0;
let resizeStartHeight = 0;
let resizeStartLeft = 0;
let resizeStartTop = 0;

// Icon dragging state
let isDraggingIcon = false;
let currentIcon: HTMLElement | null = null;
let iconOffsetX = 0;
let iconOffsetY = 0;
let dragStartTime = 0;
let dragStartX = 0;
let dragStartY = 0;
const DRAG_THRESHOLD = 5; // pixels to move before starting drag

// Window states
interface WindowState {
  state: 'normal' | 'minimized' | 'maximized';
  savedPosition?: { left: string; top: string; width: string; height: string };
}

const windowStates = new Map<string, WindowState>();

/**
 * Creates taskbar button for a window
 */
function createTaskbarButton(windowId: string, title: string, icon: string): HTMLElement {
  const button = document.createElement('button');
  button.className = 'taskbar-window-button';
  button.dataset.windowId = windowId;
  button.innerHTML = `
    <span class="taskbar-window-icon">${icon}</span>
    <span class="taskbar-window-title">${title}</span>
  `;

  // Click to restore/minimize
  button.addEventListener('click', () => {
    const window = document.getElementById(`window-${windowId}`);
    if (!window) return;

    const state = windowStates.get(windowId);
    if (state?.state === 'minimized') {
      restoreWindow(windowId);
    } else if (activeWindow === window) {
      minimizeWindow(windowId);
    } else {
      setActiveWindow(window);
      bringToFront(window);
    }
  });

  return button;
}

/**
 * Opens a window by ID
 */
export function openWindow(windowId: string): void {
  const window = document.getElementById(`window-${windowId}`);
  if (!window) return;

  // Check if already open
  const existingButton = document.querySelector(`[data-window-id="${windowId}"].taskbar-window-button`);
  if (existingButton) {
    // Just restore if minimized
    const state = windowStates.get(windowId);
    if (state?.state === 'minimized') {
      restoreWindow(windowId);
    } else {
      setActiveWindow(window);
      bringToFront(window);
    }
    return;
  }

  // Show window
  window.style.display = 'flex';
  windowStates.set(windowId, { state: 'normal' });

  // Add taskbar button
  const title = window.querySelector('.window-title')?.textContent || 'Window';
  const icon = window.querySelector('.window-icon')?.textContent || '📁';
  const taskbarCenter = document.querySelector('.taskbar-center');
  if (taskbarCenter) {
    const button = createTaskbarButton(windowId, title, icon);
    taskbarCenter.appendChild(button);
    button.classList.add('active');
  }

  // Bring to front and activate
  bringToFront(window);
  setActiveWindow(window);
}

/**
 * Closes a window by ID
 */
export function closeWindow(windowId: string): void {
  const window = document.getElementById(`window-${windowId}`);
  if (!window) return;

  window.style.display = 'none';
  windowStates.delete(windowId);

  // Remove taskbar button
  const button = document.querySelector(`[data-window-id="${windowId}"].taskbar-window-button`);
  if (button) {
    button.remove();
  }

  // If this was the active window, clear active state
  if (activeWindow === window) {
    activeWindow = null;
  }
}

/**
 * Minimizes a window
 */
export function minimizeWindow(windowId: string): void {
  const window = document.getElementById(`window-${windowId}`);
  if (!window) return;

  window.style.display = 'none';
  windowStates.set(windowId, { state: 'minimized' });

  // Update taskbar button
  const button = document.querySelector(`[data-window-id="${windowId}"].taskbar-window-button`);
  if (button) {
    button.classList.remove('active');
  }

  if (activeWindow === window) {
    activeWindow = null;
  }
}

/**
 * Maximizes a window
 */
export function maximizeWindow(windowId: string): void {
  const window = document.getElementById(`window-${windowId}`);
  if (!window) return;

  const state = windowStates.get(windowId);

  // If already maximized, restore
  if (state?.state === 'maximized' && state.savedPosition) {
    window.style.left = state.savedPosition.left;
    window.style.top = state.savedPosition.top;
    window.style.width = state.savedPosition.width;
    window.style.height = state.savedPosition.height;
    windowStates.set(windowId, { state: 'normal' });
    return;
  }

  // Save current position
  windowStates.set(windowId, {
    state: 'maximized',
    savedPosition: {
      left: window.style.left,
      top: window.style.top,
      width: window.style.width,
      height: window.style.height
    }
  });

  // Maximize (account for taskbar)
  window.style.left = '0px';
  window.style.top = '0px';
  window.style.width = '100vw';
  window.style.height = 'calc(100vh - 30px)';
}

/**
 * Restores a minimized window
 */
export function restoreWindow(windowId: string): void {
  const window = document.getElementById(`window-${windowId}`);
  if (!window) return;

  window.style.display = 'flex';
  windowStates.set(windowId, { state: 'normal' });

  // Update taskbar button
  const button = document.querySelector(`[data-window-id="${windowId}"].taskbar-window-button`);
  if (button) {
    button.classList.add('active');
  }

  bringToFront(window);
  setActiveWindow(window);
}

/**
 * Brings window to front
 */
function bringToFront(window: HTMLElement): void {
  highestZIndex++;
  window.style.zIndex = highestZIndex.toString();
}

/**
 * Sets the active window
 */
function setActiveWindow(window: HTMLElement): void {
  // Remove active class from all windows
  document.querySelectorAll('.window').forEach((w) => {
    w.classList.remove('active');
    w.classList.add('inactive');
  });

  // Remove active class from all taskbar buttons
  document.querySelectorAll('.taskbar-window-button').forEach((btn) => {
    btn.classList.remove('active');
  });

  // Set active window
  window.classList.add('active');
  window.classList.remove('inactive');
  activeWindow = window;
  bringToFront(window);

  // Set active taskbar button
  const windowId = window.dataset.windowId;
  if (windowId) {
    const button = document.querySelector(`[data-window-id="${windowId}"].taskbar-window-button`);
    if (button) {
      button.classList.add('active');
    }
  }
}

/**
 * Initialize window dragging
 */
function initDragging(window: HTMLElement, titlebar: HTMLElement): void {
  const startDrag = (e: MouseEvent | TouchEvent) => {
    // Don't start drag if clicking a button
    const target = e.target as HTMLElement;
    if (target.closest('.titlebar-button')) {
      return;
    }

    e.preventDefault();

    setActiveWindow(window);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const rect = window.getBoundingClientRect();
    offsetX = clientX - rect.left;
    offsetY = clientY - rect.top;

    isDragging = true;
    currentWindow = window;
  };

  titlebar.addEventListener('mousedown', startDrag);
  titlebar.addEventListener('touchstart', startDrag, { passive: false });
}

/**
 * Handle mouse/touch move for dragging and resizing
 */
function handleMove(e: MouseEvent | TouchEvent): void {
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

  // Check if we should start icon dragging
  if (!isDraggingIcon && currentIcon) {
    const distX = Math.abs(clientX - dragStartX);
    const distY = Math.abs(clientY - dragStartY);

    // Only start dragging if mouse moved beyond threshold
    if (distX > DRAG_THRESHOLD || distY > DRAG_THRESHOLD) {
      isDraggingIcon = true;
    }
  }

  // Handle icon dragging
  if (isDraggingIcon && currentIcon) {
    const iconsContainer = document.querySelector('.desktop-icons');
    if (!iconsContainer) return;

    const containerRect = iconsContainer.getBoundingClientRect();
    let newX = clientX - iconOffsetX - containerRect.left;
    let newY = clientY - iconOffsetY - containerRect.top;

    // Keep icon within desktop bounds
    newX = Math.max(0, Math.min(newX, containerRect.width - 75));
    newY = Math.max(0, Math.min(newY, containerRect.height - 80));

    currentIcon.style.position = 'absolute';
    currentIcon.style.left = `${newX}px`;
    currentIcon.style.top = `${newY}px`;
    return;
  }

  // Handle window dragging
  if (isDragging && currentWindow && !isResizing) {
    let newX = clientX - offsetX;
    let newY = clientY - offsetY;

    // Prevent dragging off screen (top only)
    newY = Math.max(0, newY);

    currentWindow.style.left = `${newX}px`;
    currentWindow.style.top = `${newY}px`;
    return;
  }

  // Handle resizing
  if (isResizing && currentWindow && resizeDirection) {
    const deltaX = clientX - resizeStartX;
    const deltaY = clientY - resizeStartY;

    let newWidth = resizeStartWidth;
    let newHeight = resizeStartHeight;
    let newLeft = resizeStartLeft;
    let newTop = resizeStartTop;

    // Calculate new dimensions based on direction
    if (resizeDirection.includes('e')) {
      newWidth = Math.max(200, resizeStartWidth + deltaX);
    }
    if (resizeDirection.includes('w')) {
      newWidth = Math.max(200, resizeStartWidth - deltaX);
      newLeft = resizeStartLeft + (resizeStartWidth - newWidth);
    }
    if (resizeDirection.includes('s')) {
      newHeight = Math.max(150, resizeStartHeight + deltaY);
    }
    if (resizeDirection.includes('n')) {
      newHeight = Math.max(150, resizeStartHeight - deltaY);
      newTop = Math.max(0, resizeStartTop + (resizeStartHeight - newHeight));
    }

    // Apply new dimensions
    currentWindow.style.width = `${newWidth}px`;
    currentWindow.style.height = `${newHeight}px`;
    currentWindow.style.left = `${newLeft}px`;
    currentWindow.style.top = `${newTop}px`;
  }
}

/**
 * Handle mouse/touch up to stop dragging and resizing
 */
function handleEnd(): void {
  isDragging = false;
  isResizing = false;
  isDraggingIcon = false;
  currentWindow = null;
  currentIcon = null;
  resizeDirection = null;
}

/**
 * Initialize window resizing
 */
function initResizing(window: HTMLElement): void {
  const startResize = (e: MouseEvent | TouchEvent) => {
    const handle = e.target as HTMLElement;
    const direction = handle.dataset.direction;
    if (!direction) return;

    e.preventDefault();
    e.stopPropagation();

    setActiveWindow(window);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const rect = window.getBoundingClientRect();

    resizeDirection = direction;
    resizeStartX = clientX;
    resizeStartY = clientY;
    resizeStartWidth = rect.width;
    resizeStartHeight = rect.height;
    resizeStartLeft = rect.left;
    resizeStartTop = rect.top;
    isResizing = true;
    currentWindow = window;
  };

  window.querySelectorAll('.resize-handle').forEach((handle) => {
    handle.addEventListener('mousedown', startResize);
    handle.addEventListener('touchstart', startResize, { passive: false });
  });
}

/**
 * Initialize a single window
 */
export function initWindow(window: HTMLElement): void {
  const titlebar = window.querySelector('.window-titlebar') as HTMLElement;
  const windowId = window.dataset.windowId;

  if (titlebar) {
    initDragging(window, titlebar);
  }

  // Setup resizing
  initResizing(window);

  // Setup close button
  const closeBtn = window.querySelector('.titlebar-button.close');
  if (closeBtn && windowId) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeWindow(windowId);
    });
  }

  // Setup minimize button
  const minimizeBtn = window.querySelector('.titlebar-button.minimize');
  if (minimizeBtn && windowId) {
    minimizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      minimizeWindow(windowId);
    });
  }

  // Setup maximize button
  const maximizeBtn = window.querySelector('.titlebar-button.maximize');
  if (maximizeBtn && windowId) {
    maximizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      maximizeWindow(windowId);
    });
  }

  // Focus window on click
  window.addEventListener('mousedown', () => {
    setActiveWindow(window);
  });
}

/**
 * Start dragging an icon
 */
function startIconDrag(e: MouseEvent | TouchEvent, icon: HTMLElement): void {
  // DON'T preventDefault here - it blocks dblclick!
  // We'll prevent it later if we actually start dragging

  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

  const rect = icon.getBoundingClientRect();
  iconOffsetX = clientX - rect.left;
  iconOffsetY = clientY - rect.top;

  dragStartTime = Date.now();
  dragStartX = clientX;
  dragStartY = clientY;
  currentIcon = icon;

  // Mark as ready to drag, but don't actually start dragging yet
  // We'll start dragging in handleMove if the mouse moves significantly
}

/**
 * Initialize a single desktop icon
 */
export function initIcon(icon: HTMLElement): void {
  const windowId = icon.dataset.windowId;

  if (windowId) {
    // Double-click to open (desktop and mobile)
    icon.addEventListener('dblclick', () => {
      openWindow(windowId);
    });

    // Single click to select
    icon.addEventListener('click', (e) => {
      e.stopPropagation();

      // Don't select if context menu was just shown
      if (wasContextMenuJustShown()) {
        e.preventDefault();
        return;
      }

      // Don't select if we just finished dragging
      if (isDraggingIcon) {
        return;
      }

      // Remove selection from all other icons
      document.querySelectorAll('.desktop-icon').forEach(i => {
        i.classList.remove('selected');
      });

      // Select this icon
      icon.classList.add('selected');
    });

    // Drag to move icon
    icon.addEventListener('mousedown', (e) => startIconDrag(e, icon));
    icon.addEventListener('touchstart', (e) => startIconDrag(e, icon), { passive: true });
  }
}

/**
 * Deselect icons when clicking on desktop
 */
function initDesktopClick(): void {
  const desktop = document.querySelector('.desktop');
  if (desktop) {
    desktop.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      // Only deselect if clicking on desktop itself, not on icons or windows
      if (target.classList.contains('desktop') || (target.closest('.desktop') === desktop && !target.closest('.desktop-icon') && !target.closest('.window'))) {
        document.querySelectorAll('.desktop-icon').forEach(icon => {
          icon.classList.remove('selected');
        });
      }
    });
  }
}

/**
 * Initialize window manager
 */
export function initWindowManager(): void {
  // Setup global drag handlers
  document.addEventListener('mousemove', handleMove);
  document.addEventListener('touchmove', handleMove, { passive: false });
  document.addEventListener('mouseup', handleEnd);
  document.addEventListener('touchend', handleEnd);

  // Setup desktop click to deselect icons
  initDesktopClick();

  // Setup all windows
  document.querySelectorAll('.window').forEach((windowEl) => {
    initWindow(windowEl as HTMLElement);
  });

  // Setup desktop icons
  document.querySelectorAll('.desktop-icon').forEach((iconEl) => {
    initIcon(iconEl as HTMLElement);
  });
}
