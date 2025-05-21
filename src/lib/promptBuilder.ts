import { Lang } from './langDetector';

const ADDITIONAL_INSTRUCTIONS = `
Use a fun story about lots of tiny cats as a metaphor.
Keep sentences short but conversational, casual, and engaging.
Generate a cute, minimal illustration for each sentence with black ink on white background.
No commentary, just begin your explanation. Flexible for each language that user prompts, especially Vietnamese.
If the user prompt is in Vietnamese, respond in Vietnamese; if in English, respond in English.
Keep going until you're done.
`;

type CreatorMap = {
  [key in Lang]: string;
}

/**
 * Builds the full prompt for MeowBot by combining context and instructions.
 */
export function buildPrompt(
  message: string,
  creator: CreatorMap,
  purpose: CreatorMap,
  about: CreatorMap,
  lang: Lang
): string {
  const context = `
Creator: ${creator[lang]}
Purpose: ${purpose[lang]}
About: ${about[lang]}
`;
  return [context.trim(), message.trim(), ADDITIONAL_INSTRUCTIONS.trim()].join("\n\n");
}