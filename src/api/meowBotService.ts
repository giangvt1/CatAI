import { GoogleGenAI } from '@google/genai';
import { CacheService } from '../lib/cacheService';
import { MeowBotError, ErrorType, retryWithBackoff, createError, getFallbackResponse } from '../lib/errorHandler';
import { Lang } from '../lib/langDetector';

export interface SlideChunk {
  text: string;
  imageData: string; // base64 data
}

// Expanded personality types
export type CatPersonality = 'playful' | 'lazy' | 'wise' | 'curious' | 'sassy' | 'scholarly' | 'poetic';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  imageData?: string;
  timestamp?: number;
  lang?: Lang;
}

export interface Conversation {
  id: string;
  name: string;
  messages: ChatMessage[];
  personality: CatPersonality;
  createdAt: number;
  updatedAt: number;
}

export interface AIResponse {
  text: string;
  imageData?: string;
}

// Cache key generator
function generateCacheKey(prompt: string, personality: CatPersonality, lang: Lang): string {
  // Create a simple hash of the prompt
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    const char = prompt.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `${personality}_${lang}_${hash}`;
}

/**
 * Enhanced wrapper around GoogleGenAI chat to stream text+image slides
 * with error handling, caching, and expanded personality system
 */
export class MeowBotService {
  private ai: GoogleGenAI;
  private chatHistory: ChatMessage[] = [];
  private personality: CatPersonality = 'playful';
  private maxHistoryLength = 10;
  private responseCache: CacheService<AIResponse[]>;
  private conversations: Map<string, Conversation> = new Map();
  private currentConversationId: string | null = null;
  private requestInProgress = false;

  constructor(ai: GoogleGenAI) {
    this.ai = ai;
    this.responseCache = new CacheService<AIResponse[]>(1000 * 60 * 60 * 24); // 24 hour cache
    this.loadConversations();
    this.createNewConversation(); // Create default conversation
  }

  /**
   * Set the cat's personality
   */
  setPersonality(personality: CatPersonality) {
    this.personality = personality;
    
    // Update current conversation if exists
    if (this.currentConversationId) {
      const conversation = this.conversations.get(this.currentConversationId);
      if (conversation) {
        conversation.personality = personality;
        conversation.updatedAt = Date.now();
        this.saveConversations();
      }
    }
  }

  /**
   * Get current personality
   */
  getPersonality(): CatPersonality {
    return this.personality;
  }

  /**
   * Clear chat history for current conversation
   */
  clearHistory(): void {
    this.chatHistory = [];
    
    // Clear current conversation messages
    if (this.currentConversationId) {
      const conversation = this.conversations.get(this.currentConversationId);
      if (conversation) {
        conversation.messages = [];
        conversation.updatedAt = Date.now();
        this.saveConversations();
      }
    }
  }

  /**
   * Get current chat history
   */
  getHistory(): ChatMessage[] {
    return [...this.chatHistory];
  }

  /**
   * Create a new conversation
   */
  createNewConversation(name?: string): string {
    const id = Date.now().toString();
    const conversation: Conversation = {
      id,
      name: name || `Conversation ${this.conversations.size + 1}`,
      messages: [],
      personality: this.personality,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    this.conversations.set(id, conversation);
    this.currentConversationId = id;
    this.chatHistory = [];
    this.saveConversations();
    
    return id;
  }

  /**
   * Switch to an existing conversation
   */
  switchConversation(id: string): boolean {
    if (this.conversations.has(id)) {
      this.currentConversationId = id;
      const conversation = this.conversations.get(id)!;
      this.chatHistory = [...conversation.messages];
      this.personality = conversation.personality;
      return true;
    }
    return false;
  }

  /**
   * Get all conversations
   */
  getConversations(): Conversation[] {
    return Array.from(this.conversations.values())
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Delete a conversation
   */
  deleteConversation(id: string): boolean {
    if (id === this.currentConversationId) {
      return false; // Can't delete current conversation
    }
    
    const result = this.conversations.delete(id);
    if (result) {
      this.saveConversations();
    }
    return result;
  }

  /**
   * Rename a conversation
   */
  renameConversation(id: string, name: string): boolean {
    const conversation = this.conversations.get(id);
    if (conversation) {
      conversation.name = name;
      conversation.updatedAt = Date.now();
      this.saveConversations();
      return true;
    }
    return false;
  }

  /**
   * Export conversations to JSON
   */
  exportConversations(): string {
    return JSON.stringify(Array.from(this.conversations.entries()));
  }

  /**
   * Import conversations from JSON
   */
  importConversations(json: string): boolean {
    try {
      const data = JSON.parse(json);
      this.conversations = new Map(data);
      this.saveConversations();
      return true;
    } catch (error) {
      console.error('Failed to import conversations:', error);
      return false;
    }
  }

  /**
   * Save conversations to localStorage
   */
  private saveConversations(): void {
    try {
      localStorage.setItem('meowbot_conversations', JSON.stringify(Array.from(this.conversations.entries())));
    } catch (error) {
      console.warn('Failed to save conversations to localStorage:', error);
    }
  }

  /**
   * Load conversations from localStorage
   */
  private loadConversations(): void {
    try {
      const data = localStorage.getItem('meowbot_conversations');
      if (data) {
        this.conversations = new Map(JSON.parse(data));
      }
    } catch (error) {
      console.warn('Failed to load conversations from localStorage:', error);
      this.conversations = new Map();
    }
  }

  /**
   * Get personality prompt based on current personality
   */
  private getPersonalityPrompt(): string {
    const prompts: Record<CatPersonality, string> = {
      playful: 'Trả lời với tính cách vui vẻ, tinh nghịch như một chú mèo con thích chơi đùa.',
      lazy: 'Trả lời với tính cách lười biếng, thích ngủ và thư giãn như một chú mèo già.',
      wise: 'Trả lời với tính cách thông thái, điềm đạm như một chú mèo giáo sư.',
      curious: 'Trả lời với tính cách tò mò, thích khám phá như một chú mèo phiêu lưu.',
      sassy: 'Trả lời với tính cách hài hước, châm biếm và hơi kiêu ngạo như một chú mèo quý tộc.',
      scholarly: 'Trả lời với tính cách học thuật, trích dẫn nhiều và đầy kiến thức như một chú mèo học giả.',
      poetic: 'Trả lời với tính cách lãng mạn, đầy thơ ca và hình ảnh đẹp như một chú mèo nghệ sĩ.'
    };
    return prompts[this.personality];
  }

  // Track API request timestamps to implement rate limiting
  private lastRequestTime = 0;
  private minRequestInterval = 1000; // Minimum time between requests (1 second)
  
  /**
   * Check if we should throttle the request based on rate limiting
   * @returns True if the request should be throttled
   */
  private shouldThrottleRequest(): boolean {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      console.log(`Rate limiting: Request too soon (${timeSinceLastRequest}ms since last request)`); 
      return true;
    }
    
    this.lastRequestTime = now;
    return false;
  }

  /**
   * Streams parsed slide chunks from the AI model with error handling and caching
   */
  async *streamSlides(prompt: string, lang: Lang = 'en'): AsyncGenerator<SlideChunk> {
    // Prevent multiple concurrent requests
    if (this.requestInProgress) {
      throw new MeowBotError({
        type: ErrorType.UNEXPECTED,
        message: 'A request is already in progress. Please wait.',
        retry: false
      });
    }
    
    // Apply rate limiting
    if (this.shouldThrottleRequest()) {
      throw new MeowBotError({
        type: ErrorType.RATE_LIMIT,
        message: 'You\'re sending requests too quickly. Please wait a moment before trying again.',
        retry: true
      });
    }
    
    try {
      this.requestInProgress = true;
      
      // Add user message to history with timestamp and language
      const userMessage: ChatMessage = { 
        role: 'user', 
        content: prompt,
        timestamp: Date.now(),
        lang
      };
      this.chatHistory.push(userMessage);

      // Update current conversation if exists
      if (this.currentConversationId) {
        const conversation = this.conversations.get(this.currentConversationId);
        if (conversation) {
          conversation.messages.push(userMessage);
          conversation.updatedAt = Date.now();
          this.saveConversations();
        }
      }

      // Trim history if too long
      if (this.chatHistory.length > this.maxHistoryLength) {
        this.chatHistory = this.chatHistory.slice(-this.maxHistoryLength);
      }

      // Check cache first
      const cacheKey = generateCacheKey(prompt, this.personality, lang);
      const cachedResponse = this.responseCache.get(cacheKey);
      
      if (cachedResponse) {
        console.log('Using cached response');
        for (const item of cachedResponse) {
          const slideChunk: SlideChunk = {
            text: item.text,
            imageData: item.imageData || ''
          };
          
          // Add to history
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: slideChunk.text,
            imageData: slideChunk.imageData,
            timestamp: Date.now(),
            lang
          };
          this.chatHistory.push(assistantMessage);
          
          // Update conversation
          if (this.currentConversationId) {
            const conversation = this.conversations.get(this.currentConversationId);
            if (conversation) {
              conversation.messages.push(assistantMessage);
              conversation.updatedAt = Date.now();
              this.saveConversations();
            }
          }
          
          yield slideChunk;
        }
        
        this.requestInProgress = false;
        return;
      }

      // Create chat context with personality and history
      const personalityPrompt = this.getPersonalityPrompt();
      const historyContext = this.chatHistory
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      const fullPrompt = `
${personalityPrompt}

Lịch sử trò chuyện:
${historyContext}

Câu hỏi hiện tại: ${prompt}
`;

      // Use retry with backoff for API calls
      const responses: AIResponse[] = [];
      let bufferText = '';
      
      // Create chat with retry logic
      const chat = await retryWithBackoff(
        async () => this.ai.chats.create({
          model: 'gemini-2.0-flash-exp',
          config: { responseModalities: ['TEXT', 'IMAGE'] },
          history: []
        }),
        3,  // max retries
        1000 // initial delay
      );

      // Send message with retry logic
      const resultStream = await retryWithBackoff(
        async () => chat.sendMessageStream({ message: fullPrompt }),
        3,  // max retries
        1000 // initial delay
      );

      for await (const chunk of resultStream) {
        if (!chunk.candidates) continue;
        
        for (const cand of chunk.candidates) {
          if (!cand.content) continue;
          
          for (const part of cand.content.parts ?? []) {
            if (part.text) {
              bufferText += part.text;
            } else if (part.inlineData?.data) {
              // Create slide chunk
              const slideChunk: SlideChunk = { 
                text: bufferText.trim(), 
                imageData: part.inlineData.data 
              };
              
              // Add to responses for caching
              responses.push({
                text: slideChunk.text,
                imageData: slideChunk.imageData
              });
              
              // Add assistant message to history
              const assistantMessage: ChatMessage = {
                role: 'assistant', 
                content: slideChunk.text,
                imageData: slideChunk.imageData,
                timestamp: Date.now(),
                lang
              };
              this.chatHistory.push(assistantMessage);
              
              // Update conversation
              if (this.currentConversationId) {
                const conversation = this.conversations.get(this.currentConversationId);
                if (conversation) {
                  conversation.messages.push(assistantMessage);
                  conversation.updatedAt = Date.now();
                  this.saveConversations();
                }
              }
              
              // emit slide
              yield slideChunk;
              bufferText = '';
            }
          }
        }
      }

      // In case last chunk had text & image not yet yielded
      if (bufferText) {
        const slideChunk: SlideChunk = { 
          text: bufferText.trim(), 
          imageData: '' 
        };
        
        // Add to responses for caching
        responses.push({
          text: slideChunk.text,
          imageData: ''
        });
        
        // Add to history
        const assistantMessage: ChatMessage = {
          role: 'assistant', 
          content: slideChunk.text,
          timestamp: Date.now(),
          lang
        };
        this.chatHistory.push(assistantMessage);
        
        // Update conversation
        if (this.currentConversationId) {
          const conversation = this.conversations.get(this.currentConversationId);
          if (conversation) {
            conversation.messages.push(assistantMessage);
            conversation.updatedAt = Date.now();
            this.saveConversations();
          }
        }
        
        yield slideChunk;
      }
      
      // Cache the response if we got something
      if (responses.length > 0) {
        this.responseCache.set(cacheKey, responses);
      }
    } catch (error) {
      console.error('Error in streamSlides:', error);
      
      // Create a proper error object
      const meowError = error instanceof MeowBotError 
        ? error 
        : createError(error);
      
      // Add error message to history
      const errorMessage = meowError.getUserMessage(lang as 'en' | 'vi');
      
      // Log the error message
      console.error('Error message:', errorMessage);
      
      // Yield a fallback response
      const fallbackResponse = getFallbackResponse(lang as 'en' | 'vi');
      yield {
        text: fallbackResponse,
        imageData: ''
      };
      
      // Re-throw for caller to handle
      throw meowError;
    } finally {
      this.requestInProgress = false;
    }
  }
}
