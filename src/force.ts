import { ForceChoice, ForceInput } from "./types.js";
import { indexToEmojiName } from "./utils/entries.js";

export const forceHookToken = (channel: string) => `force:${channel}`;

/**
 * Held for a whole run so a second game in the same channel can detect it.
 */
export const gameHookToken = (channel: string) => `game:${channel}`;

/**
 * Accepts "random" or a positive integer and nothing else.
 * parseInt() would read "2abc" as 2 and "-1" as -1, leaving the workflow to
 * reject values this route had already confirmed to the user.
 */
export const parseCommandText = (text: string): ForceChoice | undefined => {
	const trimmed = text.trim();

	if (trimmed === "random") {
		return trimmed;
	}

	return /^[1-9]\d*$/.test(trimmed) ? Number(trimmed) : undefined;
};

/**
 * Hook metadata arrives as unknown, so an unexpected shape falls back to
 * undefined and leaves the range check to the workflow.
 */
export const readOptionCount = (metadata: unknown) =>
	typeof metadata === "object" &&
	metadata !== null &&
	"optionCount" in metadata &&
	typeof metadata.optionCount === "number"
		? metadata.optionCount
		: undefined;

export const printForced = ({ choice, userId }: ForceInput) => {
	const printed =
		choice === "random" ? "randomly" : `:${indexToEmojiName[choice - 1]}:`;

	return `🐌🙄 y'all took too long to choose! <@${userId}> chose *${printed}* for you.`;
};

export const printRejected = ({ choice, userId }: ForceInput, count: number) =>
	`<@${userId}> tried to force *${String(choice)}*, but this poll only has ${String(count)} options. Still counting down to the original deadline. ⏳`;
