import {
  ServerOptions,
  cli,
  defineAgent,
  inference,
  llm,
  type JobContext,
  voice,
} from "@livekit/agents";
import * as openaiCompatible from "@livekit/agents-plugin-openai";
import { fileURLToPath } from "node:url";
import { ARABIC_EG_PROMPT } from "./prompts/arabic-eg.js";
import { ENGLISH_PROMPT } from "./prompts/english.js";
import { loadConfig } from "./config.js";
import { buildKnowledgeBlock, findService, loadKnowledge } from "./knowledge.js";
import { brandNameTransform, openaiSpeechInstructions } from "./pronunciation.js";

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

function createTTS(isArabic: boolean) {
  if (config.ttsProvider === "openai") {
    return new openaiCompatible.TTS({
      apiKey: config.openaiApiKey,
      model: config.openaiTtsModel,
      voice: config.openaiTtsVoice as openaiCompatible.TTSOptions["voice"],
      instructions: openaiSpeechInstructions(isArabic),
    });
  }
  return new inference.TTS({
    model: "cartesia/sonic-3",
    language: isArabic ? "ar" : "en",
  });
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    const language = getLanguage(ctx.job.metadata);
    const isArabic = language === "ar-eg";
    const knowledge = await loadKnowledge(config.wordpressGraphqlUrl);
    console.log(
      `Nexvora session: lang=${language} tts=${config.ttsProvider} knowledge=${knowledge.source} services=${knowledge.services.length}`,
    );

    const basePrompt = isArabic ? ARABIC_EG_PROMPT : ENGLISH_PROMPT;
    const instructions = `${basePrompt}\n\n${buildKnowledgeBlock(knowledge)}`;
    const greeting = isArabic
      ? "ابدأ بتحية قصيرة وودودة باللهجة المصرية في جملة أو جملتين، وعرّف نفسك كمساعد نكسفورا واسأل الزائر تقدر تساعده إزاي."
      : "Start with a short, friendly greeting in one or two sentences, introduce yourself as the Nexvora assistant, and ask how you can help.";

    const getServiceDetails = llm.tool({
      description:
        "Look up the current details of one Nexvora service from the website. Use it whenever the visitor asks about a specific service, before answering.",
      parameters: {
        type: "object",
        properties: {
          service: {
            type: "string",
            description: "The service name or slug, e.g. 'tech talent' or 'page-speed-optimization'.",
          },
        },
        required: ["service"],
      },
      execute: async (args) => {
        const query = String((args as { service?: unknown }).service ?? "");
        // Reads from the cache populated at session start; refreshes if it has expired.
        const latest = await loadKnowledge(config.wordpressGraphqlUrl);
        const match = findService(latest, query);
        if (!match) {
          return `No service matches "${query}". Available services: ${latest.services
            .map((s) => s.title)
            .join(", ")}.`;
        }
        return `${match.title}: ${match.details || "No further details are published for this service."}`;
      },
    });

    const assistant = new voice.Agent({
      instructions,
      tools: { get_service_details: getServiceDetails },
    });
    const session = new voice.AgentSession({
      stt: new inference.STT({
        model: "deepgram/nova-3",
        language: isArabic ? "ar" : "en",
      }),
      llm: openaiCompatible.LLM.withGroq({
        apiKey: config.groqApiKey,
        model: config.groqModel,
      }),
      tts: createTTS(isArabic),
      // Helps the recognizer hear the brand name correctly.
      keytermsOptions: { keyterms: ["Nexvora"] },
      // Keep the defaults (strip markdown and emoji) and say the brand name as a word.
      ttsTextTransforms: ["filter_markdown", "filter_emoji", brandNameTransform(isArabic)],
    });

    // Diagnostics: errors from STT/LLM/TTS and state changes, never conversation content.
    session.on(voice.AgentSessionEventTypes.Error, (event) => {
      const source = event.source?.constructor?.name ?? "unknown";
      console.error(`Nexvora session error from ${source}:`, event.error);
    });
    session.on(voice.AgentSessionEventTypes.AgentStateChanged, (event) => {
      console.log(`Nexvora agent state: ${event.oldState} -> ${event.newState}`);
    });
    session.on(voice.AgentSessionEventTypes.FunctionToolsExecuted, () => {
      console.log("Nexvora tool call executed");
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
