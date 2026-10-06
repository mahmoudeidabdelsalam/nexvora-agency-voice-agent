# NEXVORA Voice Agent

LiveKit Agents Node.js worker using Groq-hosted LLMs for responses and LiveKit Inference for speech-to-text and text-to-speech. It dispatches under `AGENT_NAME` (default `nexvora-assistant`) and reads the requested language from dispatch metadata.

## Local setup

```sh
npm install
cp .env.example .env
```

Set `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `GROQ_API_KEY` in `.env`. The agent calls Groq directly; it does not require a locally running Ollama server. The default model is `qwen/qwen3.6-27b`; override it with `GROQ_MODEL` if needed. Groq announced the deprecation of its hosted Llama models in June 2026, so the default uses a currently recommended alternative rather than an unavailable Llama model. STT uses `deepgram/nova-3` and TTS uses `cartesia/sonic-3` through LiveKit Inference, so the LiveKit project must have Inference enabled. The configured `AGENT_NAME` must match `voice-api/.env`. Install the LiveKit CLI and authenticate/configure the LiveKit project as described in the [LiveKit CLI documentation](https://docs.livekit.io/reference/developer-tools/livekit-cli/). Then run:

```sh
npm run dev
```

This builds the TypeScript entrypoint and starts the worker with the current `lk agent dev` command. Production runs with `npm run build && npm start`. Docker builds use this directory as the context; provide secrets only through runtime environment variables.
