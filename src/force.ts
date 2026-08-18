import { ForceInput } from "./types.js";
import { indexToEmojiName } from "./utils/entries.js";

export const forceHookToken = (channel: string) => `force:${channel}`;

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
