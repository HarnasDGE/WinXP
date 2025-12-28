/**
 * Folder Manager
 * Handles creation, renaming, and deletion of desktop folders
 */

import { openWindow } from './windowManager';

interface Folder {
  id: string;
  icon: string;
  label: string;
  x: number;
  y: number;
}

const STORAGE_KEY = 'winxp-folders';

/**
 * Get all custom folders from localStorage
 */
export function getCustomFolders(): Folder[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Save folders to localStorage
 */
function saveFolders(folders: Folder[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
  } catch (e) {
    console.error('Failed to save folders:', e);
  }
}

/**
 * Create a new folder
 */
export function createFolder(name: string): Folder | null {
  if (!name || name.trim() === '') return null;

  const folders = getCustomFolders();
  const id = `folder-${Date.now()}`;

  const newFolder: Folder = {
    id,
    icon: '📁',
    label: name.trim(),
    x: 8,
    y: folders.length * 88 + 8, // Stack vertically
  };

  folders.push(newFolder);
  saveFolders(folders);

  // Create DOM elements
  renderFolder(newFolder);

  return newFolder;
}

/**
 * Rename a folder
 */
export function renameFolder(id: string, newName: string): boolean {
  if (!newName || newName.trim() === '') return false;

  const folders = getCustomFolders();
  const folder = folders.find(f => f.id === id);

  if (!folder) return false;

  folder.label = newName.trim();
  saveFolders(folders);

  // Update DOM
  const iconEl = document.querySelector(`[data-window-id="${id}"]`);
  if (iconEl) {
    const labelEl = iconEl.querySelector('.icon-label');
    if (labelEl) {
      labelEl.textContent = newName.trim();
    }
  }

  const windowEl = document.querySelector(`.window[data-window-id="${id}"]`);
  if (windowEl) {
    const titleEl = windowEl.querySelector('.window-title');
    if (titleEl) {
      titleEl.textContent = newName.trim();
    }
  }

  return true;
}

/**
 * Delete a folder
 */
export function deleteFolder(id: string): boolean {
  // Don't delete system folders
  if (id === 'my-documents' || id === 'recycle-bin') {
    alert('Nie można usunąć folderów systemowych!');
    return false;
  }

  const folders = getCustomFolders();
  const filtered = folders.filter(f => f.id !== id);

  if (filtered.length === folders.length) return false; // Folder not found

  saveFolders(filtered);

  // Remove from DOM
  const iconEl = document.querySelector(`.desktop-icon[data-window-id="${id}"]`);
  const windowEl = document.querySelector(`.window[data-window-id="${id}"]`);
  const taskbarBtn = document.querySelector(`.taskbar-window-button[data-window-id="${id}"]`);

  if (iconEl) iconEl.remove();
  if (windowEl) windowEl.remove();
  if (taskbarBtn) taskbarBtn.remove();

  return true;
}

/**
 * Render a folder to the DOM
 */
function renderFolder(folder: Folder): void {
  const iconsContainer = document.querySelector('.desktop-icons');
  if (!iconsContainer) return;

  // Create desktop icon
  const iconDiv = document.createElement('div');
  iconDiv.className = 'desktop-icon';
  iconDiv.dataset.windowId = folder.id;
  iconDiv.innerHTML = `
    <div class="icon-image">${folder.icon}</div>
    <div class="icon-label">${folder.label}</div>
  `;

  iconsContainer.appendChild(iconDiv);

  // Create window
  const windowDiv = document.createElement('div');
  windowDiv.className = 'window';
  windowDiv.dataset.windowId = folder.id;
  windowDiv.style.display = 'none';
  windowDiv.style.left = '100px';
  windowDiv.style.top = '80px';
  windowDiv.style.width = '500px';
  windowDiv.style.height = '400px';

  windowDiv.innerHTML = `
    <div class="window-titlebar">
      <div class="titlebar-left">
        <span class="window-icon">${folder.icon}</span>
        <span class="window-title">${folder.label}</span>
      </div>
      <div class="titlebar-buttons">
        <button class="titlebar-button minimize" aria-label="Minimize">
          <span class="button-icon">_</span>
        </button>
        <button class="titlebar-button maximize" aria-label="Maximize">
          <span class="button-icon">□</span>
        </button>
        <button class="titlebar-button close" aria-label="Close">
          <span class="button-icon">✕</span>
        </button>
      </div>
    </div>
    <div class="window-content">
      <p>Folder jest pusty.</p>
    </div>
    <div class="resize-handle resize-n" data-direction="n"></div>
    <div class="resize-handle resize-e" data-direction="e"></div>
    <div class="resize-handle resize-s" data-direction="s"></div>
    <div class="resize-handle resize-w" data-direction="w"></div>
    <div class="resize-handle resize-ne" data-direction="ne"></div>
    <div class="resize-handle resize-nw" data-direction="nw"></div>
    <div class="resize-handle resize-se" data-direction="se"></div>
    <div class="resize-handle resize-sw" data-direction="sw"></div>
  `;

  document.body.appendChild(windowDiv);

  // Re-initialize window manager for the new window
  const event = new CustomEvent('folder-created', { detail: { id: folder.id } });
  document.dispatchEvent(event);
}

/**
 * Initialize folder manager
 */
export function initFolderManager(): void {
  // Load and render custom folders
  const folders = getCustomFolders();
  folders.forEach(folder => renderFolder(folder));
}
