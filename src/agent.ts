import {
  ServerOptions,
  cli,
  defineAgent,
  inference,
  type JobContext,
  voice,
} from "@livekit/agents";
import * as openai from "@livekit/agents-plugin-openai";
import { fileURLToPath } from "node:url";
import { ARABIC_EG_PROMPT } from "./prompts/arabic-eg.js";
import { ENGLISH_PROMPT } from "./prompts/english.js";
import { loadConfig } from "./config.js";

const config = loadConfig();

function getLanguage(metadata: string): "en" | "ar-eg" {
  try {
    const parsed: unknown = JSON.parse(metadata);
    if (typeof parsed === "object" && parsed !== null && "lang" in parsed) {
      const lang = parsed.lang;
      if (lang === "ar-eg") return "ar-eg";
    }
  } catch {
    // Invalid or missing dispatch metadata uses the documented English default.
  }
  return "en";
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    const language = getLanguage(ctx.job.metadata);
    const isArabic = language === "ar-eg";
    const instructions = isArabic ? ARABIC_EG_PROMPT : ENGLISH_PROMPT;
    const greeting = isArabic
      ? "ابدأ بتحية قصيرة وودودة باللهجة المصرية، وعرّف نفسك كمساعد NEXVORA واسأل الزائر كيف تقدر تساعده."
      : "Start with a short, friendly greeting, introduce yourself as the NEXVORA assistant, and ask how you can help.";

    const assistant = new voice.Agent({ instructions });
    const session = new voice.AgentSession({
      stt: new inference.STT({
        model: "deepgram/nova-3",
        language: isArabic ? "ar" : "en",
      }),
      llm: openai.LLM.withOllama({
        model: config.ollamaModel,
        baseURL: config.ollamaBaseUrl,
      }),
      tts: new inference.TTS({
        model: "cartesia/sonic-3",
        language: isArabic ? "ar" : "en",
      }),
    });

    await session.start({ agent: assistant, room: ctx.room });
    await ctx.connect();
    session.generateReply({ instructions: greeting });
  },
});

cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: config.agentName,
    wsURL: config.livekitUrl,
    apiKey: config.livekitApiKey,
    apiSecret: config.livekitApiSecret,
  }),
);
