# NEXVORA Voice Agent

LiveKit Agents Node.js worker using OpenAI Realtime. It dispatches under `AGENT_NAME` (default `nexvora-assistant`) and reads the requested language from dispatch metadata.

## Local setup

```sh
npm install
cp .env.example .env
```

Set `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `OPENAI_API_KEY` in `.env`. The configured `AGENT_NAME` must match `voice-api/.env`. Install the LiveKit CLI and authenticate/configure the LiveKit project as described in the [LiveKit CLI documentation](https://docs.livekit.io/reference/developer-tools/livekit-cli/). Then run:

```sh
npm run dev
```

This builds the TypeScript entrypoint and starts the worker with the current `lk agent dev` command. Production runs with `npm run build && npm start`. Docker builds use this directory as the context; provide secrets only through runtime environment variables.
