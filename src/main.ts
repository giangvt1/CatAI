import { GoogleGenAI } from '@google/genai';
import { marked } from 'marked';
import { buildPrompt } from './lib/promptBuilder';
import { MeowBotService, CatPersonality } from './api/meowBotService';
import { detectLanguage, Lang } from './lib/langDetector';
import './components/ChatHistory';

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
const loadingIndicator = document.getElementById('loading') as HTMLDivElement;
const chatHistory = document.querySelector('chat-history') as HTMLElement;
const toggleBtn = document.getElementById('toggle-theme') as HTMLButtonElement;

let creatorInfo: CreatorInfo | null = null;
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GOOGLE_API_KEY });
const meowBotService = new MeowBotService(ai);

// Theme handling
toggleBtn.addEventListener('click', () => {
  document.body.classList.toggle('pink');
  localStorage.setItem('theme', document.body.classList.contains('pink') ? 'pink' : 'white');
});

window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('theme');
  if (saved === 'pink') {
    document.body.classList.add('pink');
  }
});

// Load creator metadata
async function loadCreatorInfo(): Promise<CreatorInfo> {
  const res = await fetch('/creator.json');
  return await res.json();
}

function showLoading(show: boolean) {
  if (loadingIndicator) {
    loadingIndicator.hidden = !show;
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

// Main generate function
async function generate(message: string) {
  showLoading(true);
  clearUI();
  userInput.disabled = true;

  try {
    if (!creatorInfo) {
      creatorInfo = await loadCreatorInfo();
    }

    const lang: Lang = detectLanguage(message);
    const prompt = buildPrompt(
      message,
      creatorInfo.creator,
      creatorInfo.purpose,
      creatorInfo.about,
      lang
    );

    const stream = meowBotService.streamSlides(prompt);
    for await (const { text, imageData } of stream) {
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.src = `data:image/png;base64,${imageData}`;
      await renderSlide(text, img);
      updateChatHistory();
    }
  } catch (err: any) {
    console.error(err);
    showError(err.message || 'Đã có lỗi xảy ra, thử lại sau nhé!');
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
