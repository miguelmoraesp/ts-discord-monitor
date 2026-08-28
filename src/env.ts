import { z } from "zod";

const schema = z.object({
    TS_HOST: z.string().default("127.0.0.1"),
    TS_QUERY_PORT: z.coerce.number().default(10011),
    TS_QUERY_USER: z.string().min(1),
    TS_QUERY_PASSWORD: z.string().min(1),
    TS_VOICE_PORT: z.coerce.number().default(9987),
    TS_SERVER_ID: z.coerce.number().default(1),
    TS_PUBLIC_ADDRESS: z.string().min(1),
    DISCORD_TOKEN: z.string().min(1),
    DISCORD_STATUS_CHANNEL_ID: z.string().min(1),
    DISCORD_STATUS_CHANNEL_NAME: z.string().default("status"),
});

export const env = schema.parse(process.env);
