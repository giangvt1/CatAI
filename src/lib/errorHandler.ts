/**
 * Error handling service for MeowBot
 * Provides standardized error handling, retry logic, and fallback mechanisms
 */

// Define specific error types for better handling
export enum ErrorType {
  NETWORK = 'network',
  API_UNAVAILABLE = 'api_unavailable',
  API_RATE_LIMIT = 'api_rate_limit',
  RATE_LIMIT = 'rate_limit',
  AUTHENTICATION = 'authentication',
  UNEXPECTED = 'unexpected',
  TIMEOUT = 'timeout'
}

export interface ErrorDetails {
  type: ErrorType;
  message: string;
  originalError?: any;
  retry?: boolean;
  retryCount?: number;
  maxRetries?: number;
}

// User-friendly error messages based on error type
const ERROR_MESSAGES = {
  [ErrorType.NETWORK]: {
    en: 'Network connection issue. Please check your internet connection.',
    vi: 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet của bạn.'
  },
  [ErrorType.API_UNAVAILABLE]: {
    en: 'AI service is currently unavailable. Please try again later.',
    vi: 'Dịch vụ AI hiện không khả dụng. Vui lòng thử lại sau.'
  },
  [ErrorType.API_RATE_LIMIT]: {
    en: 'Too many requests. Please wait a moment before trying again.',
    vi: 'Quá nhiều yêu cầu. Vui lòng đợi một lát trước khi thử lại.'
  },
  [ErrorType.RATE_LIMIT]: {
    en: 'You\'re sending requests too quickly. Please slow down a bit.',
    vi: 'Bạn đang gửi yêu cầu quá nhanh. Vui lòng chậm lại một chút.'
  },
  [ErrorType.AUTHENTICATION]: {
    en: 'Authentication error. Please refresh the page and try again.',
    vi: 'Lỗi xác thực. Vui lòng làm mới trang và thử lại.'
  },
  [ErrorType.TIMEOUT]: {
    en: 'Request timed out. Please try again.',
    vi: 'Yêu cầu đã hết thời gian. Vui lòng thử lại.'
  },
  [ErrorType.UNEXPECTED]: {
    en: 'Something unexpected happened. Please try again.',
    vi: 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.'
  }
};

export class MeowBotError extends Error {
  type: ErrorType;
  retry: boolean;
  retryCount: number;
  maxRetries: number;
  originalError?: any;

  constructor(details: ErrorDetails) {
    super(details.message);
    this.name = 'MeowBotError';
    this.type = details.type;
    this.retry = details.retry || false;
    this.retryCount = details.retryCount || 0;
    this.maxRetries = details.maxRetries || 3;
    this.originalError = details.originalError;
  }

  // Get user-friendly message based on language
  getUserMessage(lang: 'en' | 'vi' = 'en'): string {
    return ERROR_MESSAGES[this.type][lang] || this.message;
  }

  // Check if we should retry
  shouldRetry(): boolean {
    return this.retry && this.retryCount < this.maxRetries;
  }

  // Create a new error with incremented retry count
  withIncrementedRetry(): MeowBotError {
    return new MeowBotError({
      ...this,
      retryCount: this.retryCount + 1
    });
  }
}

// Helper function to detect error type from various error sources
export function detectErrorType(error: any): ErrorType {
  if (!error) return ErrorType.UNEXPECTED;

  // Network errors
  if (!navigator.onLine || error.message?.includes('network')) {
    return ErrorType.NETWORK;
  }

  // API errors
  if (error.status === 429 || error.message?.includes('rate limit')) {
    return ErrorType.API_RATE_LIMIT;
  }

  if (error.status === 401 || error.status === 403) {
    return ErrorType.AUTHENTICATION;
  }

  if (error.status === 503 || error.status === 502 || error.message?.includes('unavailable')) {
    return ErrorType.API_UNAVAILABLE;
  }

  if (error.message?.includes('timeout')) {
    return ErrorType.TIMEOUT;
  }

  return ErrorType.UNEXPECTED;
}

// Create error from any error source
export function createError(error: any, retry = true, maxRetries = 3): MeowBotError {
  const type = detectErrorType(error);
  
  return new MeowBotError({
    type,
    message: error.message || 'Unknown error occurred',
    originalError: error,
    retry,
    retryCount: 0,
    maxRetries
  });
}

// Retry function with exponential backoff
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let retries = 0;
  
  const execute = async (): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      const meowError = error instanceof MeowBotError 
        ? error 
        : createError(error, true, maxRetries);
      
      if (retries >= maxRetries || !meowError.shouldRetry()) {
        throw meowError;
      }
      
      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(2, retries);
      console.log(`Retrying after ${delay}ms (${retries + 1}/${maxRetries})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      retries++;
      return execute();
    }
  };
  
  return execute();
}

// Fallback mechanism for when AI service is unavailable
export function getFallbackResponse(lang: 'en' | 'vi'): string {
  const fallbacks = {
    en: [
      "I'm having trouble connecting to my cat brain right now. Can you try again in a moment?",
      "Meow! My AI service seems to be napping. Please try again later.",
      "The cats who power my brain are taking a break. Please try again soon!"
    ],
    vi: [
      "Mình đang gặp khó khăn kết nối đến bộ não mèo. Bạn có thể thử lại sau một lát được không?",
      "Meow! Dịch vụ AI của mình có vẻ đang ngủ trưa. Vui lòng thử lại sau.",
      "Những chú mèo cung cấp năng lượng cho bộ não mình đang nghỉ ngơi. Hãy thử lại sau nhé!"
    ]
  };
  
  // Get random fallback message
  const messages = fallbacks[lang];
  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex];
}
