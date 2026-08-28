# ts-discord-monitor

A small bot that keeps a Discord channel in sync with the live status of a TeamSpeak server.

## What it does

- Connects to a TeamSpeak server via the ServerQuery interface and to a Discord bot.
- Posts (and keeps updating) a status message in a designated Discord channel showing:
  - Whether the server is online or offline
  - Total connected clients / max clients
  - Each channel and the members currently in it
- Renames the status channel itself to reflect the current client count (e.g. `🟢・3・status`, `🔴・status` when offline), respecting Discord's rename rate limit.
- Debounces bursts of TeamSpeak events into a single refresh, plus a periodic refresh as a safety net.
- Persists the tracked message id and last rename time to disk so it survives restarts.

## Stack

- TypeScript / Node.js
- [discord.js](https://discord.js.org/) (Components v2 for the status message)
- [ts3-nodejs-library](https://www.npmjs.com/package/ts3-nodejs-library) for the TeamSpeak ServerQuery connection
- Zod for environment validation, Pino for logging

## Running

1. Copy `.env.example` to `.env` and fill in your TeamSpeak and Discord credentials.
2. Start everything with Docker Compose:

   ```bash
   docker compose up -d
   ```

   This spins up a TeamSpeak server and the bot together. Alternatively, point `TS_HOST` at an existing TeamSpeak server and run only the `bot` service.

### Local development (without Docker)

```bash
pnpm install
pnpm dev
```

### Production

A GitHub Actions workflow ([.github/workflows/docker-publish.yml](.github/workflows/docker-publish.yml)) builds the image on every push to `main` (and on `v*.*.*` tags) and publishes it to GitHub Container Registry at `ghcr.io/miguelmoraesp/ts-discord-monitor`.

To run in production using the published image instead of building locally, pull `ghcr.io/miguelmoraesp/ts-discord-monitor:latest` for the `bot` service (state is persisted in `./data`):

```bash
docker compose -f compose.prod.yaml up -d
```

On a Podman host, [scripts/deploy.sh](scripts/deploy.sh) pulls the latest image and recreates the stack in one step:

```bash
./scripts/deploy.sh
```

## Configuration

Environment variables (see `.env.example`):

| Variable | Description |
| --- | --- |
| `TS_HOST` | TeamSpeak server host |
| `TS_QUERY_PORT` | ServerQuery port |
| `TS_QUERY_USER` / `TS_QUERY_PASSWORD` | ServerQuery credentials |
| `TS_VOICE_PORT` | Voice port |
| `TS_SERVER_ID` | Virtual server ID |
| `TS_PUBLIC_ADDRESS` | Address shown to users for connecting |
| `DISCORD_TOKEN` | Discord bot token |
| `DISCORD_STATUS_CHANNEL_ID` | Channel where the status message is posted |
| `DISCORD_STATUS_CHANNEL_NAME` | Base name used when renaming the status channel |
