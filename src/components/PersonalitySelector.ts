/**
 * Personality selector component for MeowBot
 * Allows users to select different cat personalities
 */

import { CatPersonality } from '../api/meowBotService';

const PERSONALITY_ICONS: Record<CatPersonality, string> = {
  playful: '😺',
  lazy: '😴',
  wise: '🧠',
  curious: '🔍',
  sassy: '😏',
  scholarly: '🎓',
  poetic: '🌸'
};

const PERSONALITY_NAMES: Record<CatPersonality, Record<'en' | 'vi', string>> = {
  playful: {
    en: 'Playful',
    vi: 'Vui vẻ'
  },
  lazy: {
    en: 'Lazy',
    vi: 'Lười biếng'
  },
  wise: {
    en: 'Wise',
    vi: 'Thông thái'
  },
  curious: {
    en: 'Curious',
    vi: 'Tò mò'
  },
  sassy: {
    en: 'Sassy',
    vi: 'Hài hước'
  },
  scholarly: {
    en: 'Scholarly',
    vi: 'Học giả'
  },
  poetic: {
    en: 'Poetic',
    vi: 'Thơ ca'
  }
};

class PersonalitySelector extends HTMLElement {
  private selectedPersonality: CatPersonality = 'playful';
  private _langCode: 'en' | 'vi' = 'vi';

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['personality', 'lang'];
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue) return;

    if (name === 'personality' && this.isValidPersonality(newValue)) {
      this.selectedPersonality = newValue as CatPersonality;
      this.render();
    }

    if (name === 'lang' && (newValue === 'en' || newValue === 'vi')) {
      this._langCode = newValue as 'en' | 'vi';
      this.render();
    }
  }

  private isValidPersonality(value: string): boolean {
    return Object.keys(PERSONALITY_ICONS).includes(value);
  }

  connectedCallback() {
    this.render();
    this.addEventListeners();
  }

  private addEventListeners() {
    if (!this.shadowRoot) return;

    this.shadowRoot.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const button = target.closest('.personality-button');
      
      if (button && button instanceof HTMLElement) {
        const personality = button.dataset.personality as CatPersonality;
        if (this.isValidPersonality(personality)) {
          this.selectedPersonality = personality;
          this.setAttribute('personality', personality);
          
          // Dispatch event for parent components
          this.dispatchEvent(new CustomEvent('personality-change', {
            detail: { personality },
            bubbles: true,
            composed: true
          }));
          
          this.render();
        }
      }
    });
  }

  private render() {
    if (!this.shadowRoot) return;

    const styles = `
      :host {
        display: block;
        margin: 10px 0;
      }
      
      .personality-container {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: center;
      }
      
      .personality-button {
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
      
      .personality-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }
      
      .personality-button.selected {
        border-color: var(--primary-color, #007bff);
        background-color: rgba(0, 123, 255, 0.1);
      }
      
      .personality-icon {
        font-size: 24px;
        margin-bottom: 4px;
      }
      
      .personality-name {
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

    const title = this._langCode === 'en' ? 'Choose Cat Personality' : 'Chọn Tính Cách Mèo';

    const personalities = Object.entries(PERSONALITY_ICONS).map(([personality, icon]) => {
      const isSelected = personality === this.selectedPersonality;
      const name = PERSONALITY_NAMES[personality as CatPersonality][this._langCode];
      
      return `
        <button class="personality-button ${isSelected ? 'selected' : ''}" data-personality="${personality}">
          <div class="personality-icon">${icon}</div>
          <div class="personality-name">${name}</div>
        </button>
      `;
    }).join('');

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="title">${title}</div>
      <div class="personality-container">
        ${personalities}
      </div>
    `;
  }
}

customElements.define('personality-selector', PersonalitySelector);

export default PersonalitySelector;
