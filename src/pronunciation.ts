import { voice } from "@livekit/agents";

/**
 * "NEXVORA" written in capitals is read letter by letter by most TTS engines.
 * Whatever casing the model produces, speak it as the single word it is:
 * "Nexvora" in English sessions and "نكسفورا" in Egyptian Arabic sessions.
 * Only the audio is rewritten; the on-screen transcript keeps the model's text.
 */
export function brandNameTransform(isArabic: boolean) {
  return voice.textTransforms.replace(
    { nexvora: isArabic ? "نكسفورا" : "Nexvora" },
    { caseSensitive: false },
  );
}

/** Extra delivery guidance for OpenAI's gpt-4o-mini-tts (ignored by tts-1 models). */
export function openaiSpeechInstructions(isArabic: boolean): string {
  const base =
    "Speak like a warm, confident, professional person on a call: natural pace, relaxed, friendly, never robotic or salesy. " +
    "Pronounce the company name Nexvora as one word, 'NEX-vor-ah', never spelled out letter by letter.";
  return isArabic
    ? `${base} Speak natural Egyptian Arabic (Cairo dialect), not formal Modern Standard Arabic. The company name in Arabic is نكسفورا.`
    : base;
}
