import {
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
} from "discord.js";

export type ServerSnapshot = {
    name: string;
    clientsOnline: number;
    maxClients: number;
    channels: {
        id: string;
        name: string;
        clients: string[];
    }[];
}

export type ServerStatusView =
    | { online: false; address: string }
    | { online: true; address: string; snapshot: ServerSnapshot };

const ACTIVE_COLOR = 0x57f287;
const IDLE_COLOR = 0x99aab5;
const OFFLINE_COLOR = 0xed4245;

export class ServerStatus {
    static toComponents(view: ServerStatusView): ContainerBuilder {
        if (!view.online) {
            return new ContainerBuilder()
                .setAccentColor(OFFLINE_COLOR)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("# 🔴 Servidor offline"),
                    new TextDisplayBuilder().setContent(`**Conectar:** \`${view.address}\``),
                );
        }

        const { snapshot, address } = view;
        const hasPeople = snapshot.clientsOnline > 0;
        const statusEmoji = hasPeople ? "🟢" : "⚪";

        const container = new ContainerBuilder()
            .setAccentColor(hasPeople ? ACTIVE_COLOR : IDLE_COLOR)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# ${statusEmoji} ${snapshot.name}`),
                new TextDisplayBuilder().setContent(`**Status:** Online`),
                new TextDisplayBuilder().setContent(`**Membros:** \`${snapshot.clientsOnline}\`/\`${snapshot.maxClients}\``),
                new TextDisplayBuilder().setContent(`**Conectar:** \`${address}\``),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
            );

        snapshot.channels.forEach((channel, index) => {
            const members = channel.clients.length > 0
                ? channel.clients.map((client) => `> ${client}`).join("\n")
                : "> _Vazio_";

            container.addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`**${channel.name}**\n${members}`),
                    )
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setCustomId(`status-channel-${channel.id}`)
                            .setLabel(`${channel.clients.length}`)
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true),
                    ),
            );

            if (index < snapshot.channels.length - 1) {
                container.addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false),
                );
            }
        });

        return container;
    }
}
