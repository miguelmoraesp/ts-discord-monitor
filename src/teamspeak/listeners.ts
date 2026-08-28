import type { Logger } from "pino";
import { EventError, type TeamSpeak } from "ts3-nodejs-library";

const RECONNECT_ATTEMPTS = -1; // retry forever
const RECONNECT_DELAY_MS = 10_000;

export function registerTeamSpeakListeners(client: TeamSpeak, logger: Logger, onChange?: () => void) {
    let reconnecting = false;

    client.on("error", (error) => {
        if (error instanceof EventError) {
            // benign: an event referenced a client that already left before we could look it up
            logger.warn(`TeamSpeak event error on "${error.eventName}": ${error.message}`);
            return;
        }

        logger.error(error, "TeamSpeak client error");
    });

    client.on("flooding", (error) => {
        logger.warn(error, "TeamSpeak flood protection triggered");
    });

    client.on("close", (error) => {
        logger.warn(error, "TeamSpeak connection closed");
        onChange?.();

        if (reconnecting) return;
        reconnecting = true;

        client.reconnect(RECONNECT_ATTEMPTS, RECONNECT_DELAY_MS)
            .then(() => {
                logger.info("Reconnected to TeamSpeak server");
                onChange?.();
            })
            .catch((reconnectError) => {
                logger.error(reconnectError, "Failed to reconnect to TeamSpeak server");
            })
            .finally(() => {
                reconnecting = false;
            });
    });

    client.on("clientconnect", (event) => {
        logger.info(`Client connected: ${event.client.nickname}`);
        onChange?.();
    });

    client.on("clientdisconnect", (event) => {
        logger.info(`Client disconnected: clid=${event.event.clid}`);
        onChange?.();
    });

    client.on("clientmoved", (event) => {
        logger.info(`Client ${event.client.nickname} moved to channel ${event.channel.name}`);
        onChange?.();
    });
}
