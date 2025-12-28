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

/**
 * Opens a window by ID
 */
export function openWindow(windowId: string): void {
  const window = document.getElementById(`window-${windowId}`);
  if (!window) return;

  // Show window
  window.style.display = 'flex';

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

  // If this was the active window, clear active state
  if (activeWindow === window) {
    activeWindow = null;
  }
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

  // Set active window
  window.classList.add('active');
  window.classList.remove('inactive');
  activeWindow = window;
  bringToFront(window);
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

    // Setup minimize button (just closes for now)
    const minimizeBtn = window.querySelector('.titlebar-button.minimize');
    if (minimizeBtn && windowId) {
      minimizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeWindow(windowId);
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
