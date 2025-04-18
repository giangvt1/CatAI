// src/components/Slide.ts
import { marked } from 'marked';

export function createSlide(text: string, base64: string): HTMLDivElement {
  const slide = document.createElement('div');
  slide.className = 'slide';
  const img = document.createElement('img');
  img.loading = 'lazy';
  img.src = `data:image/png;base64,${base64}`;
  const caption = document.createElement('div');
  caption.className = 'slide-caption';
  caption.innerHTML = marked.parse(text);
  slide.append(img, caption);
  return slide;
}
