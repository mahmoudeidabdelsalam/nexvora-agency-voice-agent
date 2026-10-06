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

  return {
    livekitUrl: normalizedLivekitUrl,
    livekitApiKey,
    livekitApiSecret,
    groqApiKey,
    groqModel:
      process.env.GROQ_MODEL?.trim() || "qwen/qwen3.8-27b",

    agentName:
      process.env.AGENT_NAME?.trim() ||
      "nexvora-assistant",
  };
}