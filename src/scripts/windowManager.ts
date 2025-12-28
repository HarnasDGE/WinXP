/**
 * Window Manager
 * Handles window opening, closing, dragging, and focus management
 */

let highestZIndex = 200;
let activeWindow: HTMLElement | null = null;

// Dragging state
let isDragging = false;
let currentWindow: HTMLElement | null = null;
let offsetX = 0;
let offsetY = 0;

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
 * Handle mouse/touch move for dragging
 */
function handleMove(e: MouseEvent | TouchEvent): void {
  if (!isDragging || !currentWindow) return;

  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

  let newX = clientX - offsetX;
  let newY = clientY - offsetY;

  // Prevent dragging off screen (top only)
  newY = Math.max(0, newY);

  currentWindow.style.left = `${newX}px`;
  currentWindow.style.top = `${newY}px`;
}

/**
 * Handle mouse/touch up to stop dragging
 */
function handleEnd(): void {
  isDragging = false;
  currentWindow = null;
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

  // Setup all windows
  document.querySelectorAll('.window').forEach((windowEl) => {
    const window = windowEl as HTMLElement;
    const titlebar = window.querySelector('.window-titlebar') as HTMLElement;
    const windowId = window.dataset.windowId;

    if (titlebar) {
      initDragging(window, titlebar);
    }

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
  });

  // Setup desktop icons
  document.querySelectorAll('.desktop-icon').forEach((iconEl) => {
    const icon = iconEl as HTMLElement;
    const windowId = icon.dataset.windowId;

    if (windowId) {
      icon.addEventListener('dblclick', () => {
        openWindow(windowId);
      });

      // Mobile - single tap
      icon.addEventListener('click', () => {
        openWindow(windowId);
      });
    }
  });
}
