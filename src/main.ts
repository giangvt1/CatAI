import { GoogleGenAI } from '@google/genai';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { buildPrompt } from './lib/promptBuilder';
import { MeowBotService, CatPersonality } from './api/meowBotService';
import { detectLanguage, Lang } from './lib/langDetector';
import { LoadingIndicator } from './components/LoadingIndicator';
import { keyboardManager } from './lib/keyboardShortcuts';
import './components/ChatHistory';
import './components/PersonalitySelector';
import './components/ThemeSelector';

interface CreatorInfo {
  creator: Record<Lang, string>;
  purpose: Record<Lang, string>;
  about: Record<Lang, string>;
}

// DOM elements
const userInput = document.querySelector('#input') as HTMLTextAreaElement;
const modelOutput = document.querySelector('#output') as HTMLDivElement;
const slideshow = document.querySelector('#slideshow') as HTMLDivElement;
const errorDiv = document.querySelector('#error') as HTMLDivElement;
const askBtn = document.getElementById('send-btn') as HTMLButtonElement;
const chatHistory = document.querySelector('chat-history') as HTMLElement;
const controlsContainer = document.querySelector('.controls-container') as HTMLDivElement;

// Create loading indicator
const loadingContainer = document.createElement('div');
loadingContainer.id = 'loading-container';
document.body.appendChild(loadingContainer);
const loadingIndicator = new LoadingIndicator('loading-container');

// Create UI components
const themeSelector = document.createElement('theme-selector') as HTMLElement;
const personalitySelector = document.createElement('personality-selector') as HTMLElement;
const fontSizeControls = document.createElement('div');
fontSizeControls.className = 'font-size-controls';
fontSizeControls.innerHTML = `
  <div class="title">Font Size</div>
  <div class="controls">
    <button data-size="small">A-</button>
    <button data-size="medium" class="active">A</button>
    <button data-size="large">A+</button>
  </div>
`;

// Add components to controls container
controlsContainer.appendChild(themeSelector);
controlsContainer.appendChild(personalitySelector);
controlsContainer.appendChild(fontSizeControls);

// Initialize services
let creatorInfo: CreatorInfo | null = null;
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GOOGLE_API_KEY });
const meowBotService = new MeowBotService(ai);

// Initialize language
let currentLang: Lang = 'vi';

// Set initial personality
personalitySelector.setAttribute('personality', meowBotService.getPersonality());
personalitySelector.setAttribute('lang', currentLang);

// Listen for personality changes
personalitySelector.addEventListener('personality-change', (e: Event) => {
  const { personality } = (e as CustomEvent).detail;
  meowBotService.setPersonality(personality as CatPersonality);
  chatHistory.setAttribute('personality', personality);
});

// Listen for theme changes
themeSelector.addEventListener('theme-change', (e: Event) => {
  // Theme is applied automatically by the component
  console.log('Theme changed:', (e as CustomEvent).detail.theme);
});

// Font size handling
fontSizeControls.addEventListener('click', (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (target.tagName === 'BUTTON') {
    const size = target.dataset.size;
    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    document.body.classList.add(`font-${size}`);
    
    // Update active button
    fontSizeControls.querySelectorAll('button').forEach(btn => {
      btn.classList.remove('active');
    });
    target.classList.add('active');
    
    // Save preference
    localStorage.setItem('font-size', size || 'medium');
  }
});

// Initialize UI from saved preferences
window.addEventListener('DOMContentLoaded', () => {
  // Initialize theme
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme && ['default', 'pink', 'dark', 'blue', 'green'].includes(savedTheme)) {
    themeSelector.setAttribute('theme', savedTheme);
  }
  
  // Initialize font size
  const savedFontSize = localStorage.getItem('font-size') || 'medium';
  document.body.classList.add(`font-${savedFontSize}`);
  const fontSizeButton = fontSizeControls.querySelector(`button[data-size="${savedFontSize}"]`);
  if (fontSizeButton) {
    fontSizeControls.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
    fontSizeButton.classList.add('active');
  }
  
  // Initialize conversations list if available
  updateConversationsList();
  
  // Add event listeners for conversation management
  setupConversationManagement();
  
  // Add event listeners for example questions
  setupExampleQuestions();
  
  // Setup keyboard shortcuts button
  setupKeyboardShortcuts();
});

// Setup conversation management event listeners
function setupConversationManagement() {
  // New conversation button
  const newConversationBtn = document.getElementById('new-conversation');
  if (newConversationBtn) {
    newConversationBtn.addEventListener('click', () => {
      const name = prompt('Enter a name for the new conversation:', `Conversation ${new Date().toLocaleString()}`);
      if (name) {
        meowBotService.createNewConversation(name);
        updateConversationsList();
        clearUI();
        updateChatHistory();
      }
    });
  }
  
  // Export conversations button
  const exportBtn = document.getElementById('export-conversations');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const data = meowBotService.exportConversations();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `meowbot-conversations-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
  
  // Import conversations button
  const importBtn = document.getElementById('import-conversations');
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      
      input.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const json = event.target?.result as string;
            if (meowBotService.importConversations(json)) {
              updateConversationsList();
              alert('Conversations imported successfully!');
            } else {
              alert('Failed to import conversations. Invalid format.');
            }
          } catch (error) {
            console.error('Import error:', error);
            alert('Failed to import conversations. Invalid format.');
          }
        };
        reader.readAsText(file);
      });
      
      input.click();
    });
  }
  
  // Clear conversation button
  const clearBtn = document.getElementById('clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear the current conversation?')) {
        meowBotService.clearHistory();
        clearUI();
        updateChatHistory();
      }
    });
  }
  
  // About link
  const aboutLink = document.getElementById('about-link');
  if (aboutLink) {
    aboutLink.addEventListener('click', (e) => {
      e.preventDefault();
      const aboutText = currentLang === 'en' ? 
        'MeowBot is a cute AI assistant that explains concepts using cat metaphors and illustrations. Created by Giang.' :
        'MeowBot là một trợ lý AI dễ thương giải thích các khái niệm bằng cách sử dụng hình ảnh và ẩn dụ về mèo. Được tạo bởi Giang.';
      
      alert(aboutText);
    });
  }
}

// Setup example questions event listeners
function setupExampleQuestions() {
  const examples = document.querySelectorAll('#examples li');
  examples.forEach(example => {
    example.addEventListener('click', () => {
      const question = example.textContent;
      if (question) {
        userInput.value = question;
        generate(question);
      }
    });
  });
}

// Update conversations list in the UI
function updateConversationsList() {
  const conversations = meowBotService.getConversations();
  const conversationsContainer = document.querySelector('.conversations-list');
  
  if (!conversationsContainer) return;
  
  // Clear existing list
  conversationsContainer.innerHTML = '';
  
  if (conversations.length === 0) {
    conversationsContainer.innerHTML = '<div class="empty-state">No saved conversations</div>';
    return;
  }
  
  // Create conversation items
  conversations.forEach(conv => {
    const item = document.createElement('div');
    item.className = 'conversation-item';
    item.dataset.id = conv.id;
    
    // Use DOMPurify to sanitize the conversation name
    const safeName = DOMPurify.sanitize(conv.name);
    
    item.innerHTML = `
      <div class="conversation-name">${safeName}</div>
      <div class="conversation-meta">
        <span class="personality-badge">${conv.personality}</span>
        <span class="message-count">${conv.messages.length} messages</span>
      </div>
      <div class="conversation-actions">
        <button class="rename-btn">✏️</button>
        <button class="delete-btn">🗑️</button>
      </div>
    `;
    
    conversationsContainer.appendChild(item);
  });
  
  // Add event listeners
  conversationsContainer.querySelectorAll('.conversation-item').forEach(item => {
    // Ensure item is an HTMLElement
    if (!(item instanceof HTMLElement)) return;
    
    // Switch to conversation on click
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      if (id) {
        meowBotService.switchConversation(id);
        updateChatHistory();
      }
    });
    
    // Rename conversation
    const renameBtn = item.querySelector('.rename-btn');
    renameBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = item.dataset.id;
      if (!id) return;
      
      const newName = prompt('Enter new conversation name:', '');
      if (newName) {
        meowBotService.renameConversation(id, newName);
        updateConversationsList();
      }
    });
    
    // Delete conversation
    const deleteBtn = item.querySelector('.delete-btn');
    deleteBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = item.dataset.id;
      if (!id) return;
      
      if (confirm('Are you sure you want to delete this conversation?')) {
        meowBotService.deleteConversation(id);
        updateConversationsList();
      }
    });
  });
}

// Load creator metadata
async function loadCreatorInfo(): Promise<CreatorInfo> {
  const res = await fetch('/creator.json');
  return await res.json();
}

function showLoading(show: boolean) {
  if (loadingIndicator) {
    if (show) {
      loadingIndicator.show();
    } else {
      loadingIndicator.hide();
    }
  }
}

function clearUI() {
  modelOutput.innerHTML = '';
  slideshow.innerHTML = '';
  errorDiv.hidden = true;
  errorDiv.textContent = '';
}

function showError(message: string) {
  errorDiv.textContent = message;
  errorDiv.hidden = false;
}

// Render a slide (text + image)
async function renderSlide(text: string, imgEl: HTMLImageElement) {
  const slide = document.createElement('div');
  slide.className = 'slide';
  const caption = document.createElement('div');
  caption.innerHTML = await marked.parse(text);
  slide.append(imgEl, caption);
  slideshow.append(slide);
}

// Update chat history display
function updateChatHistory() {
  if (chatHistory) {
    chatHistory.setAttribute('messages', JSON.stringify(meowBotService.getHistory()));
  }
}

// Main generate function with improved error handling and language detection
async function generate(message: string) {
  showLoading(true);
  clearUI();
  userInput.disabled = true;

  try {
    if (!creatorInfo) {
      creatorInfo = await loadCreatorInfo();
    }

    // Detect language and update UI components
    const lang: Lang = detectLanguage(message);
    currentLang = lang;
    
    // Update language for UI components
    personalitySelector.setAttribute('lang', lang);
    themeSelector.setAttribute('lang', lang);
    
    // Build prompt with creator info
    const prompt = buildPrompt(
      message,
      creatorInfo.creator,
      creatorInfo.purpose,
      creatorInfo.about,
      lang
    );

    // Add loading animation for slides
    const loadingSlide = document.createElement('div');
    loadingSlide.className = 'loading-slide';
    loadingSlide.innerHTML = `
      <div class="loading-cat">
        <img src="/loading-cat.svg" alt="Loading..." />
      </div>
      <p>${lang === 'en' ? 'Thinking...' : 'Đang suy nghĩ...'}</p>
    `;
    slideshow.appendChild(loadingSlide);

    // Stream slides with the detected language
    const stream = meowBotService.streamSlides(prompt, lang);
    let slideCount = 0;
    
    for await (const { text, imageData } of stream) {
      // Remove loading slide after first response
      if (slideCount === 0) {
        slideshow.removeChild(loadingSlide);
      }
      
      // Create image element with progressive loading
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.src = `data:image/png;base64,${imageData}`;
      
      // Add loading state
      img.classList.add('loading');
      img.onload = () => img.classList.remove('loading');
      
      // Sanitize and render text
      const sanitizedText = DOMPurify.sanitize(await marked.parse(text));
      const textEl = document.createElement('div');
      textEl.innerHTML = sanitizedText;
      
      // Render slide with animation
      await renderSlide(text, img);
      slideCount++;
      
      // Update chat history UI
      updateChatHistory();
      
      // Update conversations list
      updateConversationsList();
    }
  } catch (err: any) {
    console.error('Error generating response:', err);
    
    // Show user-friendly error message
    const errorMessage = err.getUserMessage ? 
      err.getUserMessage(currentLang as 'en' | 'vi') : 
      (currentLang === 'en' ? 
        'Something went wrong. Please try again later.' : 
        'Đã có lỗi xảy ra, vui lòng thử lại sau.');
    
    showError(errorMessage);
    
    // Add a sad cat for error state
    const errorCat = document.createElement('div');
    errorCat.className = 'error-cat';
    errorCat.innerHTML = `
      <img src="/sad-cat.svg" alt="Error" />
      <p>${errorMessage}</p>
    `;
    slideshow.appendChild(errorCat);
  } finally {
    showLoading(false);
    userInput.disabled = false;
    userInput.focus();
  }
}

// Event listeners
askBtn.addEventListener('click', () => {
  const question = userInput.value.trim();
  if (question) {
    generate(question);
    userInput.value = '';
  }
});

userInput.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const question = userInput.value.trim();
    if (question) {
      generate(question);
      userInput.value = '';
    }
  }
});

// Handle personality changes
chatHistory?.addEventListener('personality-change', (e: Event) => {
  const { personality } = (e as CustomEvent).detail;
  meowBotService.setPersonality(personality as CatPersonality);
  chatHistory.setAttribute('personality', personality);
});

// Setup keyboard shortcuts button and functionality
function setupKeyboardShortcuts() {
  // Add keyboard shortcuts button to footer
  const footerLinks = document.querySelector('.footer-links');
  if (footerLinks) {
    const separator = document.createElement('span');
    separator.className = 'separator';
    separator.textContent = '|';
    
    const shortcutsLink = document.createElement('a');
    shortcutsLink.href = '#';
    shortcutsLink.id = 'shortcuts-link';
    shortcutsLink.textContent = 'Keyboard Shortcuts';
    shortcutsLink.addEventListener('click', (e) => {
      e.preventDefault();
      keyboardManager.toggleHelpDialog();
    });
    
    footerLinks.appendChild(separator);
    footerLinks.appendChild(shortcutsLink);
  }
  
  // Register additional keyboard shortcuts
  keyboardManager.register({
    key: 's',
    description: 'Send message',
    action: () => {
      const question = userInput.value.trim();
      if (question) {
        generate(question);
        userInput.value = '';
      }
    }
  });
  
  keyboardManager.register({
    key: 'p',
    description: 'Toggle personality selector',
    action: () => {
      const personalitySelector = document.querySelector('personality-selector');
      if (personalitySelector) {
        personalitySelector.toggleAttribute('open');
      }
    }
  });
  
  keyboardManager.register({
    key: 't',
    description: 'Toggle theme selector',
    action: () => {
      const themeSelector = document.querySelector('theme-selector');
      if (themeSelector) {
        themeSelector.toggleAttribute('open');
      }
    }
  });
}

// Optional: handling purpose/creator quick replies
const quickAsks: Record<string, string[]> = {
  creator: ['ai tạo', 'ai thiết kế', 'được thiết kế bởi ai'],
  purpose: ['mục đích', 'dùng để làm gì'],
};

askBtn.addEventListener('click', () => {
  const q = userInput.value.toLowerCase();
  if (!creatorInfo) {
    return;
  }
  if (quickAsks.creator.some(key => q.includes(key))) {
    modelOutput.innerHTML = creatorInfo!.creator['vi'];
    return;
  }
  if (quickAsks.purpose.some(key => q.includes(key))) {
    modelOutput.innerHTML = creatorInfo!.purpose['vi'];
    return;
  }
});
