import type { Client } from "discord.js";
import type { Logger } from "pino";

export function registerDiscordListeners(client: Client, logger: Logger) {
    client.on("error", (error) => {
        logger.error(error, "Discord client error");
    });

    client.on("shardError", (error, shardId) => {
        logger.warn(error, `Discord shard ${shardId} connection error (discord.js will retry automatically)`);
    });

    client.on("shardDisconnect", (_event, shardId) => {
        logger.warn(`Discord shard ${shardId} disconnected`);
    });

    client.on("shardResume", (shardId) => {
        logger.info(`Discord shard ${shardId} reconnected`);
    });

    client.on("clientReady", () => {
        logger.info(`Connected to Discord as ${client.user?.tag ?? "Unknown User"}`);
    });
}
