import { GoogleGenAI } from '@google/genai';

export interface SlideChunk {
  text: string;
  imageData: string; // base64 data
}

export type CatPersonality = 'playful' | 'lazy' | 'wise' | 'curious';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  imageData?: string;
}

/**
 * Wrapper around GoogleGenAI chat to stream text+image slides
 */
export class MeowBotService {
  private ai: GoogleGenAI;
  private chatHistory: ChatMessage[] = [];
  private personality: CatPersonality = 'playful';
  private maxHistoryLength = 10;

  constructor(ai: GoogleGenAI) {
    this.ai = ai;
  }

  /**
   * Set the cat's personality
   */
  setPersonality(personality: CatPersonality) {
    this.personality = personality;
  }

  /**
   * Clear chat history
   */
  clearHistory() {
    this.chatHistory = [];
  }

  /**
   * Get current chat history
   */
  getHistory(): ChatMessage[] {
    return [...this.chatHistory];
  }

  private getPersonalityPrompt(): string {
    const prompts = {
      playful: 'Trả lời với tính cách vui vẻ, tinh nghịch như một chú mèo con thích chơi đùa.',
      lazy: 'Trả lời với tính cách lười biếng, thích ngủ và thư giãn như một chú mèo già.',
      wise: 'Trả lời với tính cách thông thái, điềm đạm như một chú mèo giáo sư.',
      curious: 'Trả lời với tính cách tò mò, thích khám phá như một chú mèo phiêu lưu.'
    };
    return prompts[this.personality];
  }

  /**
   * Streams parsed slide chunks from the AI model
   */
  async *streamSlides(prompt: string): AsyncGenerator<SlideChunk> {
    // Add user message to history
    this.chatHistory.push({ role: 'user', content: prompt });

    // Trim history if too long
    if (this.chatHistory.length > this.maxHistoryLength) {
      this.chatHistory = this.chatHistory.slice(-this.maxHistoryLength);
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

    const chat = this.ai.chats.create({
      model: 'gemini-2.0-flash-exp',
      config: { responseModalities: ['TEXT', 'IMAGE'] },
      history: []
    });

    const resultStream = await chat.sendMessageStream({ message: fullPrompt });
    let bufferText = '';

    for await (const chunk of resultStream) {
      for (const cand of chunk.candidates) {
        for (const part of cand.content.parts ?? []) {
          if (part.text) {
            bufferText += part.text;
          } else if (part.inlineData?.data) {
            // Add assistant message to history
            const slideChunk = { 
              text: bufferText.trim(), 
              imageData: part.inlineData.data 
            };
            this.chatHistory.push({ 
              role: 'assistant', 
              content: slideChunk.text,
              imageData: slideChunk.imageData
            });
            
            // emit slide
            yield slideChunk;
            bufferText = '';
          }
        }
      }
    }

    // In case last chunk had text & image not yet yielded
    if (bufferText) {
      const slideChunk = { 
        text: bufferText.trim(), 
        imageData: '' 
      };
      this.chatHistory.push({ 
        role: 'assistant', 
        content: slideChunk.text
      });
      yield slideChunk;
    }
  }
}
