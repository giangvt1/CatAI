/**
 * Keyboard shortcuts handler for CatAI
 * Provides keyboard navigation and accessibility features
 */

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  description: string;
  action: () => void;
}

export class KeyboardShortcutManager {
  private shortcuts: KeyboardShortcut[] = [];
  private helpDialogVisible = false;
  private helpDialog: HTMLElement | null = null;

  constructor() {
    this.initHelpDialog();
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  /**
   * Register a new keyboard shortcut
   * @param shortcut Keyboard shortcut to register
   */
  public register(shortcut: KeyboardShortcut): void {
    this.shortcuts.push(shortcut);
    this.updateHelpDialog();
  }

  /**
   * Unregister a keyboard shortcut
   * @param key Key to unregister
   */
  public unregister(key: string): void {
    this.shortcuts = this.shortcuts.filter(s => s.key !== key);
    this.updateHelpDialog();
  }

  /**
   * Show the help dialog with all registered shortcuts
   */
  public showHelpDialog(): void {
    if (this.helpDialog) {
      this.helpDialog.classList.add('visible');
      this.helpDialogVisible = true;
    }
  }

  /**
   * Hide the help dialog
   */
  public hideHelpDialog(): void {
    if (this.helpDialog) {
      this.helpDialog.classList.remove('visible');
      this.helpDialogVisible = false;
    }
  }

  /**
   * Toggle the help dialog visibility
   */
  public toggleHelpDialog(): void {
    if (this.helpDialogVisible) {
      this.hideHelpDialog();
    } else {
      this.showHelpDialog();
    }
  }

  /**
   * Initialize the help dialog
   */
  private initHelpDialog(): void {
    this.helpDialog = document.createElement('div');
    this.helpDialog.className = 'keyboard-shortcuts-dialog';
    this.helpDialog.innerHTML = `
      <div class="dialog-content">
        <div class="dialog-header">
          <h2>Keyboard Shortcuts</h2>
          <button class="close-btn">×</button>
        </div>
        <div class="shortcuts-list"></div>
      </div>
    `;

    document.body.appendChild(this.helpDialog);

    // Add close button event listener
    const closeBtn = this.helpDialog.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideHelpDialog());
    }

    // Close on click outside
    this.helpDialog.addEventListener('click', (e) => {
      if (e.target === this.helpDialog) {
        this.hideHelpDialog();
      }
    });

    this.updateHelpDialog();
  }

  /**
   * Update the help dialog with current shortcuts
   */
  private updateHelpDialog(): void {
    if (!this.helpDialog) return;

    const shortcutsList = this.helpDialog.querySelector('.shortcuts-list');
    if (!shortcutsList) return;

    shortcutsList.innerHTML = '';

    if (this.shortcuts.length === 0) {
      shortcutsList.innerHTML = '<p>No shortcuts registered</p>';
      return;
    }

    const table = document.createElement('table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>Shortcut</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    this.shortcuts.forEach(shortcut => {
      const row = document.createElement('tr');
      
      const keyCombo = [];
      if (shortcut.ctrlKey) keyCombo.push('Ctrl');
      if (shortcut.altKey) keyCombo.push('Alt');
      if (shortcut.shiftKey) keyCombo.push('Shift');
      keyCombo.push(shortcut.key.toUpperCase());
      
      row.innerHTML = `
        <td><kbd>${keyCombo.join(' + ')}</kbd></td>
        <td>${shortcut.description}</td>
      `;
      
      tbody.appendChild(row);
    });

    shortcutsList.appendChild(table);
  }

  /**
   * Handle keydown events
   * @param e Keyboard event
   */
  private handleKeyDown(e: KeyboardEvent): void {
    // Don't trigger shortcuts when typing in input fields
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      // Allow ? key for help even in input fields
      if (e.key === '?' && e.shiftKey) {
        this.toggleHelpDialog();
        e.preventDefault();
      }
      return;
    }

    // Check for help dialog shortcut (Shift + ?)
    if (e.key === '?' && e.shiftKey) {
      this.toggleHelpDialog();
      e.preventDefault();
      return;
    }

    // Check for registered shortcuts
    for (const shortcut of this.shortcuts) {
      if (
        e.key.toLowerCase() === shortcut.key.toLowerCase() &&
        !!e.ctrlKey === !!shortcut.ctrlKey &&
        !!e.altKey === !!shortcut.altKey &&
        !!e.shiftKey === !!shortcut.shiftKey
      ) {
        shortcut.action();
        e.preventDefault();
        return;
      }
    }
  }
}

// Create singleton instance
export const keyboardManager = new KeyboardShortcutManager();

// Register default shortcuts
keyboardManager.register({
  key: '/',
  description: 'Focus search input',
  action: () => {
    const input = document.querySelector('#input') as HTMLTextAreaElement;
    if (input) {
      input.focus();
    }
  }
});

keyboardManager.register({
  key: 'n',
  description: 'New conversation',
  action: () => {
    const newConversationBtn = document.getElementById('new-conversation');
    if (newConversationBtn) {
      newConversationBtn.click();
    }
  }
});

keyboardManager.register({
  key: 'c',
  description: 'Clear current conversation',
  action: () => {
    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
      clearBtn.click();
    }
  }
});

keyboardManager.register({
  key: 'Escape',
  description: 'Close dialogs',
  action: () => {
    keyboardManager.hideHelpDialog();
  }
});
