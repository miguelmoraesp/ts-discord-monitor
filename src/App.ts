import * as Discord from "discord.js";
import type { Logger } from "pino";
import pino from "pino";
import { TeamSpeak } from "ts3-nodejs-library";
import { registerDiscordListeners } from "./discord/listeners.js";
import { registerTeamSpeakListeners } from "./teamspeak/listeners.js";
import { StatusChannelUpdater } from "./discord/statusChannel.js";
import type { ServerSnapshot } from "./base/ServerStatus.js";

type DiscordClientOptions = {
    config: Discord.ClientOptions;
    token: string;
}

type StatusChannelOptions = {
    channelId: string;
    baseName: string;
    publicAddress: string;
}

type Config = {
    tsOptions: TeamSpeak.ConnectionParams
    discordOptions: DiscordClientOptions
    statusChannel: StatusChannelOptions
}

export class App {
    TSOptions: TeamSpeak.ConnectionParams;
    discordOptions: DiscordClientOptions;
    statusChannelOptions: StatusChannelOptions;
    TSClient: TeamSpeak | null = null;
    discordClient: Discord.Client | null = null;
    logger: Logger = pino()

    constructor(config: Config) {
        this.TSOptions = config.tsOptions;
        this.discordOptions = {
            config: config.discordOptions.config,
            token: config.discordOptions.token,
        }
        this.statusChannelOptions = config.statusChannel;
    }

    async start() {
        // Connect to TeamSpeak server
        this.TSClient = await TeamSpeak.connect(this.TSOptions);

        const clientInfo = await this.TSClient.whoami();
        this.logger.info(`Connected to TeamSpeak server as ${clientInfo.clientNickname}`);

        // Connect to Discord
        this.discordClient = new Discord.Client(this.discordOptions.config);
        registerDiscordListeners(this.discordClient, this.logger);
        await this.discordClient.login(this.discordOptions.token);

        // Keep the status channel in sync
        const statusChannel = await StatusChannelUpdater.create(
            this.discordClient,
            this.statusChannelOptions.channelId,
            this.statusChannelOptions.baseName,
            this,
            this.statusChannelOptions.publicAddress,
            this.logger,
        );

        registerTeamSpeakListeners(this.TSClient, this.logger, () => statusChannel.scheduleRefresh());
        statusChannel.scheduleRefresh();
        statusChannel.startPeriodicRefresh();
    }

    async getServerSnapshot(): Promise<ServerSnapshot> {
        if (!this.TSClient) {
            throw new Error("TeamSpeak client is not connected.");
        }

        const [serverInfo, channels] = await Promise.all([
            this.TSClient.serverInfo(),
            this.TSClient.channelList(),
        ]);

        const channelsWithClients = await Promise.all(
            channels.map(async (channel) => ({
                id: channel.cid,
                name: channel.name,
                clients: (await channel.getClients()).map((client) => client.nickname),
            }))
        );

        const clientsOnline = channelsWithClients.reduce((sum, channel) => sum + channel.clients.length, 0);

        return {
            name: serverInfo.virtualserverName,
            clientsOnline,
            maxClients: serverInfo.virtualserverMaxclients,
            channels: channelsWithClients,
        };
    }
}