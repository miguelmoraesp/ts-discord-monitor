import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

type State = {
    statusMessageId?: string;
    lastChannelRenameAt?: number;
};

const STATE_PATH = join(process.cwd(), "data", "state.json");

export function readState(): State {
    if (!existsSync(STATE_PATH)) return {};
    return JSON.parse(readFileSync(STATE_PATH, "utf-8"));
}

export function writeState(state: State): void {
    mkdirSync(dirname(STATE_PATH), { recursive: true });
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}
