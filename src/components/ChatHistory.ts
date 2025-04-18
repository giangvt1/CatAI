import { ChatMessage, CatPersonality } from '../api/meowBotService';

export class ChatHistory extends HTMLElement {
  private messages: ChatMessage[] = [];
  private selectedPersonality: CatPersonality = 'playful';

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['messages', 'personality'];
  }

  attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
    if (name === 'messages') {
      this.messages = JSON.parse(newValue);
      this.render();
    } else if (name === 'personality') {
      this.selectedPersonality = newValue as CatPersonality;
      this.render();
    }
  }

  private onPersonalityChange(personality: CatPersonality) {
    this.selectedPersonality = personality;
    this.dispatchEvent(new CustomEvent('personality-change', {
      detail: { personality },
      bubbles: true,
      composed: true
    }));
  }

  private render() {
    if (!this.shadowRoot) {
      return;
    }

    const personalityIcons = {
      playful: '😺',
      lazy: '😽',
      wise: '🧐',
      curious: '🐱'
    };

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, sans-serif;
        }
        .chat-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 1rem;
        }
        .personality-selector {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
          justify-content: center;
        }
        .personality-btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #f0f0f0;
        }
        .personality-btn.selected {
          background: #007bff;
          color: white;
        }
        .personality-btn:hover {
          transform: scale(1.05);
        }
        .message {
          margin: 1rem 0;
          padding: 1rem;
          border-radius: 10px;
          max-width: 80%;
        }
        .message.user {
          background: #e3f2fd;
          margin-left: auto;
        }
        .message.assistant {
          background: #f5f5f5;
          margin-right: auto;
        }
        .message img {
          max-width: 100%;
          border-radius: 5px;
          margin-top: 0.5rem;
        }
        .empty-state {
          text-align: center;
          color: #666;
          padding: 2rem;
        }
      </style>
      
      <div class="chat-container">
        <div class="personality-selector">
          ${Object.entries(personalityIcons).map(([type, icon]) => `
            <button 
              class="personality-btn ${type === this.selectedPersonality ? 'selected' : ''}"
              data-personality="${type}"
            >
              ${icon} ${type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          `).join('')}
        </div>

        ${this.messages.length === 0 ? `
          <div class="empty-state">
            <p>Chưa có tin nhắn nào. Hãy bắt đầu trò chuyện với mèo!</p>
          </div>
        ` : ''}

        ${this.messages.map(msg => `
          <div class="message ${msg.role}">
            <div class="text">${msg.content}</div>
            ${msg.imageData ? `
              <img src="data:image/png;base64,${msg.imageData}" alt="Cat illustration" />
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;

    // Add event listeners
    this.shadowRoot.querySelectorAll('.personality-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const personality = btn.getAttribute('data-personality') as CatPersonality;
        this.onPersonalityChange(personality);
      });
    });
  }
}

customElements.define('chat-history', ChatHistory);
