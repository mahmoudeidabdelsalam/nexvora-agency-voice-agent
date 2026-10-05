import "dotenv/config";

const requiredVariables = [
  "LIVEKIT_URL",
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET",
  "OPENAI_API_KEY",
] as const;

export function loadConfig() {
  const values = Object.fromEntries(
    requiredVariables.map((name) => [name, process.env[name]?.trim()]),
  );
  const missing = requiredVariables.filter((name) => !values[name]);

  if (missing.length > 0) {
    throw new Error(`Missing required voice-agent environment variables: ${missing.join(", ")}`);
  }
  if (!values.LIVEKIT_URL?.startsWith("wss://")) {
    throw new Error("LIVEKIT_URL must be a secure wss:// LiveKit URL");
  }

  return {
    livekitUrl: values.LIVEKIT_URL,
    livekitApiKey: values.LIVEKIT_API_KEY,
    livekitApiSecret: values.LIVEKIT_API_SECRET,
    openAiApiKey: values.OPENAI_API_KEY,
    agentName: process.env.AGENT_NAME?.trim() || "nexvora-assistant",
  };
}
