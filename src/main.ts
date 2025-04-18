import {GoogleGenAI} from '@google/genai';
import {marked} from 'marked';

const ai = new GoogleGenAI({apiKey: "AIzaSyCsnZT98ULdpJEKGsry5Fv-wnedcRvzV2Y"});

const chat = ai.chats.create({
  model: 'gemini-2.0-flash-exp',
  config: {
    responseModalities: ['TEXT', 'IMAGE'],
  },
  history: [],
});

const userInput = document.querySelector('#input') as HTMLTextAreaElement;
const modelOutput = document.querySelector('#output') as HTMLDivElement;
const slideshow = document.querySelector('#slideshow') as HTMLDivElement;
const error = document.querySelector('#error') as HTMLDivElement;
async function loadCreatorInfo() {
  const res = await fetch('/creator.json');
  const data = await res.json();
  return data;
}
const additionalInstructions = `
Use a fun story about lots of tiny cats as a metaphor.
Keep sentences short but conversational, casual, and engaging.
Generate a cute, minimal illustration for each sentence with black ink on white background.
No commentary, just begin your explanation. Flexible for each languages that user prompt to
Keep going until you're done.`;

async function addSlide(text: string, image: HTMLImageElement) {
  const slide = document.createElement('div');
  slide.className = 'slide';
  const caption = document.createElement('div') as HTMLDivElement;
  caption.innerHTML = await marked.parse(text);
  slide.append(image);
  slide.append(caption);
  slideshow.append(slide);
}

function parseError(error: string) {
  try {
    // Try to parse JSON if it exists in the string
    const jsonMatch = error.match(/{.*}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.error?.message) return parsed.error.message;
    }
    return error;
  } catch (e) {
    return "Unknown error occurred";
  }
}
const input = document.getElementById("input") as HTMLTextAreaElement;
const output = document.getElementById("response") as HTMLDivElement;
const askBtn = document.getElementById("ask-button");

let creatorInfo: any = {};

loadCreatorInfo().then((data) => {
  creatorInfo = data;
});

askBtn?.addEventListener("click", () => {
  const question = input.value.toLowerCase().trim();

  if (question.includes("ai tạo") || question.includes("ai thiết kế") || question.includes("được thiết kế bởi ai")) {
    output.innerHTML = creatorInfo.creator;
  } else {
    output.innerText = "Hmm... tớ chưa hiểu câu đó 🤔";
  }
});
async function generate(message: string) {
  userInput.disabled = true;

  chat.history.length = 0;
  modelOutput.innerHTML = '';
  slideshow.innerHTML = '';
  error.innerHTML = '';
  error.toggleAttribute('hidden', true);

  try {
    const userTurn = document.createElement('div') as HTMLDivElement;
    userTurn.innerHTML = await marked.parse(message);
    userTurn.className = 'user-turn';
    modelOutput.append(userTurn);
    userInput.value = '';

    const result = await chat.sendMessageStream({
      message: message + additionalInstructions,
    });

    let text = '';
    let img = null;

    for await (const chunk of result) {
      for (const candidate of chunk.candidates) {
        for (const part of candidate.content.parts ?? []) {
          if (part.text) {
            text += part.text;
          } else {
            try {
              const data = part.inlineData;
              if (data) {
                img = document.createElement('img');
                img.src = `data:image/png;base64,` + data.data;
              } else {
                console.log('no data', chunk);
              }
            } catch (e) {
              console.log('no data', chunk);
            }
          }
          if (text && img) {
            await addSlide(text, img);
            slideshow.removeAttribute('hidden');
            text = '';
            img = null;
          }
        }
      }
    }
    if (img) {
      await addSlide(text, img);
      slideshow.removeAttribute('hidden');
      text = '';
    }
  } catch (e) {
    const msg = parseError(e);
    error.innerHTML = `Something went wrong: ${msg}`;
    error.removeAttribute('hidden');
  }
  userInput.disabled = false;
  userInput.focus();
}

userInput.addEventListener('keydown', async (e: KeyboardEvent) => {
  if (e.code === 'Enter') {
    e.preventDefault();
    const message = userInput.value;
    await generate(message);
  }
});

const examples = document.querySelectorAll('#examples li');
examples.forEach((li) =>
  li.addEventListener('click', async (e) => {
    await generate(li.textContent);
  }),
);
