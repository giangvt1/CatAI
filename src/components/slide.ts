// src/components/Slide.ts
import { marked } from 'marked';

/**
 * Creates a slide with text and image asynchronously
 * This version properly awaits the marked.parse Promise
 */
export async function createSlide(text: string, base64: string): Promise<HTMLDivElement> {
  const slide = document.createElement('div');
  slide.className = 'slide';
  const img = document.createElement('img');
  img.loading = 'lazy';
  img.src = `data:image/png;base64,${base64}`;
  const caption = document.createElement('div');
  caption.className = 'slide-caption';
  caption.innerHTML = await marked.parse(text);
  slide.append(img, caption);
  return slide;
}

/**
 * Creates a slide with text and image synchronously
 * This version sets initial empty content and updates it when parsing completes
 */
export function createSlideSync(text: string, base64: string): HTMLDivElement {
  const slide = document.createElement('div');
  slide.className = 'slide';
  const img = document.createElement('img');
  img.loading = 'lazy';
  img.src = `data:image/png;base64,${base64}`;
  const caption = document.createElement('div');
  caption.className = 'slide-caption';
  // Set initial content
  caption.innerHTML = '';
  // Update when parsing completes
  const parsedPromise = marked.parse(text);
  if (parsedPromise instanceof Promise) {
    parsedPromise.then((html: string) => {
      caption.innerHTML = html;
    });
  } else {
    caption.innerHTML = parsedPromise;
  }
  slide.append(img, caption);
  return slide;
}
