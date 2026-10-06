# NEXVORA Voice Agent

LiveKit Agents Node.js worker using Ollama for LLM responses and LiveKit Inference for speech-to-text and text-to-speech. It dispatches under `AGENT_NAME` (default `nexvora-assistant`) and reads the requested language from dispatch metadata.

## Local setup

```sh
npm install
cp .env.example .env
```

Set `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` in `.env`. The Ollama-compatible endpoint defaults to `http://localhost:11434/v1` and the model defaults to `llama3.2`; override these with `OLLAMA_BASE_URL` and `OLLAMA_MODEL` as needed. Pull the model with `ollama pull llama3.2` if it is not already installed. The endpoint must be reachable from the voice-agent process; when running in Docker, configure an address reachable from the container rather than relying on its `localhost`. STT uses `deepgram/nova-3` and TTS uses `cartesia/sonic-3` through LiveKit Inference, so the LiveKit project must have Inference enabled. The configured `AGENT_NAME` must match `voice-api/.env`. Install the LiveKit CLI and authenticate/configure the LiveKit project as described in the [LiveKit CLI documentation](https://docs.livekit.io/reference/developer-tools/livekit-cli/). Then run:

```sh
npm run dev
```

This builds the TypeScript entrypoint and starts the worker with the current `lk agent dev` command. Production runs with `npm run build && npm start`. Docker builds use this directory as the context; provide secrets only through runtime environment variables.
