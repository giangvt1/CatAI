import { franc } from 'franc';

// Supported languages - expand this list to add more languages
export type Lang = 'en' | 'vi' | 'fr' | 'de' | 'es' | 'zh' | 'ja' | 'ko';

// Map franc language codes to our simplified codes
const LANG_MAP: Record<string, Lang> = {
  'eng': 'en',  // English
  'vie': 'vi',  // Vietnamese
  'fra': 'fr',  // French
  'deu': 'de',  // German
  'spa': 'es',  // Spanish
  'cmn': 'zh',  // Chinese
  'jpn': 'ja',  // Japanese
  'kor': 'ko'   // Korean
};

// Default language if detection fails
const DEFAULT_LANG: Lang = 'en';

/**
 * Enhanced language detection using franc library
 * Detects the language of the input text and maps it to our supported languages
 */
export function detectLanguage(input: string): Lang {
  // For very short inputs, use a simpler detection method
  if (input.length < 10) {
    return simpleDetectLanguage(input);
  }
  
  try {
    // Use franc for language detection
    const langCode = franc(input, { minLength: 3, only: Object.keys(LANG_MAP) });
    
    // If detection failed or returned 'und' (undefined)
    if (langCode === 'und') {
      return simpleDetectLanguage(input);
    }
    
    // Map the detected language to our supported languages
    return LANG_MAP[langCode] || DEFAULT_LANG;
  } catch (error) {
    console.warn('Language detection failed:', error);
    return simpleDetectLanguage(input);
  }
}

/**
 * Simple fallback language detection for short texts or when franc fails
 * Primarily distinguishes between Vietnamese and English
 */
function simpleDetectLanguage(input: string): Lang {
  // Vietnamese accents and characters range
  const vietnamesePattern = /[\u00C0-\u017F\u1EA0-\u1EFF]/;
  
  // Chinese/Japanese/Korean character ranges
  const cjkPattern = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/;
  
  if (vietnamesePattern.test(input)) return 'vi';
  if (cjkPattern.test(input)) {
    // Simple heuristic for CJK languages
    // This is a very basic approach - franc does better for longer text
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(input)) return 'ja';
    if (/[\uAC00-\uD7AF]/.test(input)) return 'ko';
    return 'zh';
  }
  
  return DEFAULT_LANG;
}

// Get language name for display
export function getLanguageName(lang: Lang): string {
  const names: Record<Lang, string> = {
    'en': 'English',
    'vi': 'Tiếng Việt',
    'fr': 'Français',
    'de': 'Deutsch',
    'es': 'Español',
    'zh': '中文',
    'ja': '日本語',
    'ko': '한국어'
  };
  
  return names[lang] || 'Unknown';
}
