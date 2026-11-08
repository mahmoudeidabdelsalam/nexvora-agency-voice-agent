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

## Voice, pronunciation and site knowledge

- **Voice:** if `OPENAI_API_KEY` is set the agent speaks with OpenAI TTS (`gpt-4o-mini-tts`, voice `coral`; change with `OPENAI_TTS_MODEL` / `OPENAI_TTS_VOICE`). Without a key it uses Cartesia as before. Set `TTS_PROVIDER=cartesia|openai` to force one. On LiveKit Cloud add the key as a secret (`lk agent update-secrets`) and redeploy.
- **Brand name:** the model's text is rewritten before synthesis so "Nexvora" is spoken as one word ("نكسفورا" in Egyptian Arabic) instead of being spelled out. The transcript on screen is unchanged. The STT is also biased towards the word "Nexvora".
- **Answers from the website:** at the start of each session the agent loads services and company content from `WORDPRESS_GRAPHQL_URL` (default `https://cms.nexvoraagency.com/graphql`), cached for 10 minutes, and adds it to the prompt. The `get_service_details` tool returns the full text of one service on request. If WordPress is unreachable it uses the last good copy, or a small built-in list that mirrors `llms.txt`. Content edits in WordPress show up within about ten minutes, with no redeploy.
- The agent cannot submit leads or bookings; it summarizes the visitor's project and points them to the contact page.

