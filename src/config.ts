import "dotenv/config";

export function loadConfig() {
  const livekitUrl = process.env.LIVEKIT_URL?.trim();
  const livekitApiKey = process.env.LIVEKIT_API_KEY?.trim();
  const livekitApiSecret = process.env.LIVEKIT_API_SECRET?.trim();

  if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
    throw new Error("LiveKit runtime credentials are missing");
  }

  if (!livekitUrl.startsWith("wss://")) {
    throw new Error("LIVEKIT_URL must be a secure wss:// LiveKit URL");
  }

  return {
    livekitUrl,
    livekitApiKey,
    livekitApiSecret,

    ollamaBaseUrl:
      process.env.OLLAMA_BASE_URL?.trim() ||
      "http://localhost:11434/v1",

    ollamaModel:
      process.env.OLLAMA_MODEL?.trim() ||
      "llama3.2",

    agentName:
      process.env.AGENT_NAME?.trim() ||
      "nexvora-assistant",
  };
}