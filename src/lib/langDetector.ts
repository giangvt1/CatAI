type Lang = 'en' | 'vi';

/**
 * Simple language detection: checks for non-ASCII characters to detect Vietnamese.
 * Could be replaced by a more robust library like 'franc'.
 */
export function detectLanguage(input: string): Lang {
  // Vietnamese accents range
  const vietnamesePattern = /[\u00C0-\u017F\u1EA0-\u1EFF]/;
  return vietnamesePattern.test(input) ? 'vi' : 'en';
}

export { Lang };
