import { ChannelType, MessageFlags, type Client, type TextChannel } from "discord.js";
import type { Logger } from "pino";
import type { App } from "../App.js";
import { ServerStatus, type ServerStatusView } from "../base/ServerStatus.js";
import { readState, writeState } from "../state.js";

const MESSAGE_REFRESH_DEBOUNCE_MS = 5_000;
const CHANNEL_RENAME_MIN_INTERVAL_MS = 10 * 60 * 1000;
const PERIODIC_REFRESH_MS = 5 * 60 * 1000;

function buildChannelName(baseName: string, view: ServerStatusView): string {
    if (!view.online || view.snapshot.clientsOnline === 0) {
        return `🔴・${baseName}`;
    }

    return `🟢・${view.snapshot.clientsOnline}・${baseName}`;
}

export class StatusChannelUpdater {
    private messageId: string | null;
    private lastChannelRenameAt: number;
    private refreshTimer: NodeJS.Timeout | null = null;

    private constructor(
        private readonly channel: TextChannel,
        private readonly app: App,
        private readonly address: string,
        private readonly baseChannelName: string,
        private readonly logger: Logger,
    ) {
        const state = readState();
        this.messageId = state.statusMessageId ?? null;
        this.lastChannelRenameAt = state.lastChannelRenameAt ?? 0;
    }

    static async create(
        discordClient: Client,
        channelId: string,
        baseChannelName: string,
        app: App,
        address: string,
        logger: Logger,
    ): Promise<StatusChannelUpdater> {
        const channel = await discordClient.channels.fetch(channelId);

        if (!channel || channel.type !== ChannelType.GuildText) {
            throw new Error(`Discord channel ${channelId} is not a text channel`);
        }

        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
            SendMessages: false,
        });

        return new StatusChannelUpdater(channel, app, address, baseChannelName, logger);
    }

    /** debounces bursts of TeamSpeak events into a single refresh */
    scheduleRefresh(): void {
        if (this.refreshTimer) return;

        this.refreshTimer = setTimeout(() => {
            this.refreshTimer = null;
            this.refresh().catch((error) => this.logger.error(error, "Failed to refresh status channel"));
        }, MESSAGE_REFRESH_DEBOUNCE_MS);
    }

    startPeriodicRefresh(): void {
        setInterval(() => this.scheduleRefresh(), PERIODIC_REFRESH_MS);
    }

    private async refresh(): Promise<void> {
        const view = await this.buildView();

        await this.updateMessage(view);
        await this.maybeRenameChannel(view);
    }

    private async buildView(): Promise<ServerStatusView> {
        try {
            const snapshot = await this.app.getServerSnapshot();
            return { online: true, address: this.address, snapshot };
        } catch (error) {
            this.logger.warn(error, "TeamSpeak server unreachable, marking status as offline");
            return { online: false, address: this.address };
        }
    }

    private async updateMessage(view: ServerStatusView): Promise<void> {
        const components = [ServerStatus.toComponents(view)];

        if (this.messageId) {
            try {
                const message = await this.channel.messages.fetch(this.messageId);
                await message.edit({ components, flags: MessageFlags.IsComponentsV2 });
                return;
            } catch {
                this.logger.warn("Tracked status message no longer exists, sending a new one");
                this.messageId = null;
            }
        }

        const message = await this.channel.send({ components, flags: MessageFlags.IsComponentsV2 });
        this.messageId = message.id;
        this.persistState();
    }

    private async maybeRenameChannel(view: ServerStatusView): Promise<void> {
        const desiredName = buildChannelName(this.baseChannelName, view);

        if (this.channel.name === desiredName) return;

        const now = Date.now();
        if (now - this.lastChannelRenameAt < CHANNEL_RENAME_MIN_INTERVAL_MS) {
            this.logger.debug("Skipping channel rename to respect Discord's rate limit");
            return;
        }

        await this.channel.setName(desiredName);
        this.lastChannelRenameAt = now;
        this.persistState();
    }

    private persistState(): void {
        const state: { statusMessageId?: string; lastChannelRenameAt: number } = {
            lastChannelRenameAt: this.lastChannelRenameAt,
        };

        if (this.messageId) {
            state.statusMessageId = this.messageId;
        }

        writeState(state);
    }
}
