import { describe, expect, it } from "vitest";

import { readPinnedBotMessage } from "./pins.js";

describe(readPinnedBotMessage, () => {
	it("returns the text and timestamp when given a pinned bot message", () => {
		const actual = readPinnedBotMessage({
			message: { bot_id: "B0123456789", text: "Hey everyone!", ts: "1.2" },
			type: "message",
		});

		expect(actual).toEqual({ text: "Hey everyone!", ts: "1.2" });
	});

	it("returns undefined when given a pinned message from a person", () => {
		const actual = readPinnedBotMessage({
			message: { text: "Hey everyone!", ts: "1.2", user: "U0123456789" },
			type: "message",
		});

		expect(actual).toBeUndefined();
	});

	it("returns undefined when given a pin that isn't a message", () => {
		const actual = readPinnedBotMessage({ file: { id: "F0123456789" } });

		expect(actual).toBeUndefined();
	});

	it("returns undefined when given a message without a timestamp", () => {
		const actual = readPinnedBotMessage({
			message: { bot_id: "B0123456789", text: "Hey everyone!" },
			type: "message",
		});

		expect(actual).toBeUndefined();
	});

	it("returns undefined when given no item", () => {
		const actual = readPinnedBotMessage(undefined);

		expect(actual).toBeUndefined();
	});
});
