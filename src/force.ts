import { ForceInput } from "./types.js";
import { indexToEmojiName } from "./utils/entries.js";

export const forceHookToken = (channel: string) => `force:${channel}`;

/**
 * Held for a whole run so a second game in the same channel can detect it.
 */
export const gameHookToken = (channel: string) => `game:${channel}`;

export const parseCommandText = (text: string): ForceInput | undefined => {
	if (text === "random") {
		return text;
	}

	const next = parseInt(text);

	return isNaN(next) ? undefined : next;
};

export const printForced = (forced: ForceInput) => {
	const printed =
		forced === "random" ? "randomly" : `:${indexToEmojiName[forced - 1]}:`;

	return `🐌🙄 y'all took too long to choose! An admin has chosen *${printed}* for you.`;
};
