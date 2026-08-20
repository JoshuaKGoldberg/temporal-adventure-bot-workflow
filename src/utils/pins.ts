/**
 * `pins.list` items are typed without the message they pin, so the fields this
 * needs are read defensively rather than asserted.
 * Requiring `bot_id` keeps pinned messages from people out of the result.
 */
export const readPinnedBotMessage = (item: unknown) => {
	if (typeof item !== "object" || item === null || !("message" in item)) {
		return undefined;
	}

	const { message } = item;

	if (typeof message !== "object" || message === null) {
		return undefined;
	}

	const fromBot = "bot_id" in message && typeof message.bot_id === "string";

	const text =
		"text" in message && typeof message.text === "string"
			? message.text
			: undefined;

	const ts =
		"ts" in message && typeof message.ts === "string" ? message.ts : undefined;

	return fromBot && text !== undefined && ts !== undefined
		? { text, ts }
		: undefined;
};
