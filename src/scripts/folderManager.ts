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

interface RecycledFolder extends Folder {
  deletedAt: number;
  originalLabel: string;
}

const STORAGE_KEY = 'winxp-folders';
const RECYCLE_BIN_KEY = 'winxp-recycle-bin';

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
 * Get recycled folders from localStorage
 */
export function getRecycledFolders(): RecycledFolder[] {
  try {
    const data = localStorage.getItem(RECYCLE_BIN_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Save recycled folders to localStorage
 */
function saveRecycledFolders(folders: RecycledFolder[]): void {
  try {
    localStorage.setItem(RECYCLE_BIN_KEY, JSON.stringify(folders));
  } catch (e) {
    console.error('Failed to save recycled folders:', e);
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

  // If it's a custom folder, update localStorage
  if (folder) {
    folder.label = newName.trim();
    saveFolders(folders);
  }

  // Update DOM for both custom and system folders
  const iconEl = document.querySelector(`.desktop-icon[data-window-id="${id}"]`);
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

  // Also update taskbar button if window is open
  const taskbarBtn = document.querySelector(`.taskbar-window-button[data-window-id="${id}"] .taskbar-button-label`);
  if (taskbarBtn) {
    taskbarBtn.textContent = newName.trim();
  }

  return true;
}

/**
 * Delete a folder (move to recycle bin)
 */
export function deleteFolder(id: string): boolean {
  // Don't delete system folders
  if (id === 'my-documents' || id === 'recycle-bin') {
    alert('Nie można usunąć folderów systemowych!');
    return false;
  }

  const folders = getCustomFolders();
  const folderIndex = folders.findIndex(f => f.id === id);

  if (folderIndex === -1) return false; // Folder not found

  // Get the folder and move to recycle bin
  const folder = folders[folderIndex];
  const recycledFolders = getRecycledFolders();

  const recycledFolder: RecycledFolder = {
    ...folder,
    deletedAt: Date.now(),
    originalLabel: folder.label,
  };

  recycledFolders.push(recycledFolder);
  saveRecycledFolders(recycledFolders);

  // Remove from active folders
  folders.splice(folderIndex, 1);
  saveFolders(folders);

  // Remove from DOM
  const iconEl = document.querySelector(`.desktop-icon[data-window-id="${id}"]`);
  const windowEl = document.querySelector(`.window[data-window-id="${id}"]`);
  const taskbarBtn = document.querySelector(`.taskbar-window-button[data-window-id="${id}"]`);

  if (iconEl) iconEl.remove();
  if (windowEl) windowEl.remove();
  if (taskbarBtn) taskbarBtn.remove();

  // Update recycle bin display
  updateRecycleBinDisplay();

  return true;
}

/**
 * Restore a folder from recycle bin
 */
export function restoreFolder(id: string): boolean {
  const recycledFolders = getRecycledFolders();
  const folderIndex = recycledFolders.findIndex(f => f.id === id);

  if (folderIndex === -1) return false;

  // Get the folder and restore it
  const recycledFolder = recycledFolders[folderIndex];
  const folder: Folder = {
    id: recycledFolder.id,
    icon: recycledFolder.icon,
    label: recycledFolder.originalLabel,
    x: recycledFolder.x,
    y: recycledFolder.y,
  };

  // Add back to active folders
  const folders = getCustomFolders();
  folders.push(folder);
  saveFolders(folders);

  // Remove from recycle bin
  recycledFolders.splice(folderIndex, 1);
  saveRecycledFolders(recycledFolders);

  // Render the folder
  renderFolder(folder);

  // Update recycle bin display
  updateRecycleBinDisplay();

  return true;
}

/**
 * Permanently delete a folder from recycle bin
 */
export function permanentlyDeleteFolder(id: string): boolean {
  const recycledFolders = getRecycledFolders();
  const filtered = recycledFolders.filter(f => f.id !== id);

  if (filtered.length === recycledFolders.length) return false;

  saveRecycledFolders(filtered);
  updateRecycleBinDisplay();

  return true;
}

/**
 * Empty the recycle bin
 */
export function emptyRecycleBin(): boolean {
  if (!confirm('Czy na pewno chcesz opróżnić Kosz? Wszystkie elementy zostaną trwale usunięte.')) {
    return false;
  }

  saveRecycledFolders([]);
  updateRecycleBinDisplay();

  return true;
}

/**
 * Update recycle bin window display
 */
function updateRecycleBinDisplay(): void {
  const recycleBinWindow = document.querySelector('.window[data-window-id="recycle-bin"] .window-content');
  if (!recycleBinWindow) return;

  const recycledFolders = getRecycledFolders();

  if (recycledFolders.length === 0) {
    recycleBinWindow.innerHTML = '<p>Kosz jest pusty.</p>';
    return;
  }

  let html = '<div style="padding: 8px;"><h3 style="margin-bottom: 12px;">Elementy w Koszu:</h3>';
  html += '<div style="display: flex; flex-direction: column; gap: 8px;">';

  recycledFolders.forEach(folder => {
    const deletedDate = new Date(folder.deletedAt).toLocaleString('pl-PL');
    html += `
      <div style="display: flex; align-items: center; gap: 12px; padding: 8px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 4px;">
        <span style="font-size: 24px;">${folder.icon}</span>
        <div style="flex: 1;">
          <div style="font-weight: bold;">${folder.originalLabel}</div>
          <div style="font-size: 11px; color: #666;">Usunięto: ${deletedDate}</div>
        </div>
        <button onclick="window.restoreFolder('${folder.id}')" style="padding: 4px 12px; cursor: pointer;">Przywróć</button>
        <button onclick="window.permanentlyDeleteFolder('${folder.id}')" style="padding: 4px 12px; cursor: pointer; background: #d32f2f; color: white; border: none;">Usuń na stałe</button>
      </div>
    `;
  });

  html += '</div>';
  html += '<div style="margin-top: 16px;"><button onclick="window.emptyRecycleBin()" style="padding: 8px 16px; cursor: pointer; background: #d32f2f; color: white; border: none;">Opróżnij Kosz</button></div>';
  html += '</div>';

  recycleBinWindow.innerHTML = html;
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
    <div class="window-content folder-view">
      <div class="folder-toolbar">
        <div class="toolbar-section">
          <button class="toolbar-button" title="Wstecz">⬅️</button>
          <button class="toolbar-button" title="Do przodu">➡️</button>
          <button class="toolbar-button" title="W górę">⬆️</button>
        </div>
        <div class="toolbar-address">
          <span class="address-label">Adres:</span>
          <input type="text" class="address-bar" value="${folder.label}" readonly>
        </div>
      </div>
      <div class="folder-content-area">
        <div class="folder-sidebar">
          <div class="sidebar-section">
            <div class="sidebar-title">Zadania folderów</div>
            <a href="#" class="sidebar-link">Utwórz nowy folder</a>
          </div>
          <div class="sidebar-section">
            <div class="sidebar-title">Inne miejsca</div>
            <a href="#" class="sidebar-link">Moje Dokumenty</a>
            <a href="#" class="sidebar-link">Mój komputer</a>
          </div>
        </div>
        <div class="folder-items">
          <div class="empty-folder-message">
            <p>Ten folder jest pusty.</p>
          </div>
        </div>
      </div>
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

  // Initialize recycle bin display
  updateRecycleBinDisplay();

  // Expose functions to window object for onclick handlers
  (window as any).restoreFolder = restoreFolder;
  (window as any).permanentlyDeleteFolder = permanentlyDeleteFolder;
  (window as any).emptyRecycleBin = emptyRecycleBin;
}
