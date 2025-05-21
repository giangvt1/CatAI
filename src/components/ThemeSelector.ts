/**
 * Theme selector component for MeowBot
 * Allows users to select different UI themes
 */

type Theme = 'default' | 'pink' | 'dark' | 'blue' | 'green';

const THEME_ICONS: Record<Theme, string> = {
  default: '☀️',
  pink: '🌸',
  dark: '🌙',
  blue: '🌊',
  green: '🌿'
};

const THEME_NAMES: Record<Theme, Record<'en' | 'vi', string>> = {
  default: {
    en: 'Light',
    vi: 'Sáng'
  },
  pink: {
    en: 'Pink',
    vi: 'Hồng'
  },
  dark: {
    en: 'Dark',
    vi: 'Tối'
  },
  blue: {
    en: 'Ocean',
    vi: 'Biển'
  },
  green: {
    en: 'Forest',
    vi: 'Rừng'
  }
};

class ThemeSelector extends HTMLElement {
  private selectedTheme: Theme = 'default';
  private _langCode: 'en' | 'vi' = 'vi';

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && Object.keys(THEME_ICONS).includes(savedTheme)) {
      this.selectedTheme = savedTheme as Theme;
    }
  }

  static get observedAttributes() {
    return ['theme', 'lang'];
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue) return;

    if (name === 'theme' && this.isValidTheme(newValue)) {
      this.selectedTheme = newValue as Theme;
      this.render();
    }

    if (name === 'lang' && (newValue === 'en' || newValue === 'vi')) {
      this._langCode = newValue as 'en' | 'vi';
      this.render();
    }
  }

  private isValidTheme(value: string): boolean {
    return Object.keys(THEME_ICONS).includes(value);
  }

  connectedCallback() {
    this.render();
    this.addEventListeners();
    this.applyTheme(this.selectedTheme);
  }

  private addEventListeners() {
    if (!this.shadowRoot) return;

    this.shadowRoot.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest('.theme-button');
      
      if (button && button instanceof HTMLElement) {
        const theme = button.dataset.theme as Theme;
        if (this.isValidTheme(theme)) {
          this.selectedTheme = theme;
          this.setAttribute('theme', theme);
          
          // Apply theme
          this.applyTheme(theme);
          
          // Save to localStorage
          localStorage.setItem('theme', theme);
          
          // Dispatch event for parent components
          this.dispatchEvent(new CustomEvent('theme-change', {
            detail: { theme },
            bubbles: true,
            composed: true
          }));
          
          this.render();
        }
      }
    });
  }

  private applyTheme(theme: Theme) {
    // Remove all theme classes
    document.body.classList.remove('pink', 'dark', 'blue', 'green');
    
    // Add selected theme class
    if (theme !== 'default') {
      document.body.classList.add(theme);
    }
  }

  private render() {
    if (!this.shadowRoot) return;

    const styles = `
      :host {
        display: block;
        margin: 10px 0;
      }
      
      .theme-container {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: center;
      }
      
      .theme-button {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 8px;
        border-radius: 8px;
        border: 1px solid var(--border-color, #e0e0e0);
        background-color: var(--bg-color, #fff);
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 70px;
      }
      
      .theme-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }
      
      .theme-button.selected {
        border-color: var(--primary-color, #007bff);
        background-color: rgba(0, 123, 255, 0.1);
      }
      
      .theme-icon {
        font-size: 24px;
        margin-bottom: 4px;
      }
      
      .theme-name {
        font-size: 12px;
        text-align: center;
      }
      
      .title {
        text-align: center;
        margin-bottom: 10px;
        font-size: 14px;
        color: var(--text-color, #333);
      }
    `;

    const title = this._langCode === 'en' ? 'Choose Theme' : 'Chọn Giao Diện';

    const themes = Object.entries(THEME_ICONS).map(([theme, icon]) => {
      const isSelected = theme === this.selectedTheme;
      const name = THEME_NAMES[theme as Theme][this._langCode];
      
      return `
        <button class="theme-button ${isSelected ? 'selected' : ''}" data-theme="${theme}">
          <div class="theme-icon">${icon}</div>
          <div class="theme-name">${name}</div>
        </button>
      `;
    }).join('');

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="title">${title}</div>
      <div class="theme-container">
        ${themes}
      </div>
    `;
  }
}

customElements.define('theme-selector', ThemeSelector);

export default ThemeSelector;
