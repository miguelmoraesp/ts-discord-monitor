import { GatewayIntentBits } from "discord.js";
import { QueryProtocol } from "ts3-nodejs-library";
import { App } from "./App.js";
import { env } from "./env.js";

const app = new App({
    tsOptions: {
        host: env.TS_HOST,
        protocol: QueryProtocol.SSH,
        queryport: env.TS_QUERY_PORT,
        serverport: env.TS_VOICE_PORT,
        username: env.TS_QUERY_USER,
        password: env.TS_QUERY_PASSWORD,
        readyTimeout: 10000,
        keepAlive: true,
        keepAliveTimeout: 250,
        ignoreQueries: true,
    },
    discordOptions: {
        config: {
            intents: [GatewayIntentBits.Guilds],
        },
        token: env.DISCORD_TOKEN,
    },
    statusChannel: {
        channelId: env.DISCORD_STATUS_CHANNEL_ID,
        baseName: env.DISCORD_STATUS_CHANNEL_NAME,
        publicAddress: env.TS_PUBLIC_ADDRESS,
    },
});

app.start();
