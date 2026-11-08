import "dotenv/config";

export function loadConfig() {
  const livekitUrl = process.env.LIVEKIT_URL?.trim();
  const livekitApiKey = process.env.LIVEKIT_API_KEY?.trim();
  const livekitApiSecret = process.env.LIVEKIT_API_SECRET?.trim();
  const groqApiKey = process.env.GROQ_API_KEY?.trim();

  if (!livekitUrl) {
    throw new Error(
      "LIVEKIT_URL is missing from the LiveKit Cloud runtime environment"
    );
  }

  if (!livekitApiKey) {
    throw new Error(
      "LIVEKIT_API_KEY is missing from the LiveKit Cloud runtime environment"
    );
  }

  if (!livekitApiSecret) {
    throw new Error(
      "LIVEKIT_API_SECRET is missing from the LiveKit Cloud runtime environment"
    );
  }

  if (!groqApiKey) {
    throw new Error(
      "GROQ_API_KEY is missing from the voice-agent runtime environment"
    );
  }

  const normalizedLivekitUrl = livekitUrl
    .replace(/^https:\/\//, "wss://")
    .replace(/^http:\/\//, "ws://");

  const openaiApiKey = process.env.OPENAI_API_KEY?.trim() || undefined;
  const requestedTts = process.env.TTS_PROVIDER?.trim().toLowerCase();
  if (requestedTts === "openai" && !openaiApiKey) {
    throw new Error(
      "TTS_PROVIDER=openai requires OPENAI_API_KEY in the voice-agent runtime environment"
    );
  }
  // OpenAI voice is the default whenever a key is available; Cartesia otherwise.
  const ttsProvider: "openai" | "cartesia" =
    requestedTts === "cartesia" ? "cartesia" : openaiApiKey ? "openai" : "cartesia";

  return {
    livekitUrl: normalizedLivekitUrl,
    livekitApiKey,
    livekitApiSecret,
    groqApiKey,
    openaiApiKey,
    ttsProvider,
    openaiTtsModel: process.env.OPENAI_TTS_MODEL?.trim() || "gpt-4o-mini-tts",
    openaiTtsVoice: process.env.OPENAI_TTS_VOICE?.trim() || "coral",
    wordpressGraphqlUrl:
      process.env.WORDPRESS_GRAPHQL_URL?.trim() ||
      "https://cms.nexvoraagency.com/graphql",
    groqModel:
      process.env.GROQ_MODEL?.trim() || "qwen/qwen3.8-27b",

    agentName:
      process.env.AGENT_NAME?.trim() ||
      "nexvora-assistant",
  };
}