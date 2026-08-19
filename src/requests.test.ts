import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { allowedForcers, isFromSlack, parseCommand } from "./requests.js";

const signingSecret = "signing-secret";
const nowMs = 1700000000000;
const body = "channel_id=C0123456789&text=random&user_id=U0123456789";

const sign = (timestamp: string, signed: string) =>
	`v0=${createHmac("sha256", signingSecret)
		.update(`v0:${timestamp}:${signed}`)
		.digest("hex")}`;

describe(isFromSlack, () => {
	beforeEach(() => {
		vi.stubEnv("SLACK_SIGNING_SECRET", signingSecret);
		vi.useFakeTimers();
		vi.setSystemTime(nowMs);
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.useRealTimers();
	});

	it("returns true when given a request signed with the signing secret", () => {
		const timestamp = String(nowMs / 1000);

		const actual = isFromSlack(body, sign(timestamp, body), timestamp);

		expect(actual).toBe(true);
	});

	it("returns false when given a timestamp that isn't a number", () => {
		const actual = isFromSlack(body, sign("abc", body), "abc");

		expect(actual).toBe(false);
	});

	it("returns false when given a timestamp more than five minutes old", () => {
		const timestamp = String(nowMs / 1000 - 60 * 6);

		const actual = isFromSlack(body, sign(timestamp, body), timestamp);

		expect(actual).toBe(false);
	});

	it("returns false when given a signature for a different body", () => {
		const timestamp = String(nowMs / 1000);

		const actual = isFromSlack(body, sign(timestamp, "text=1"), timestamp);

		expect(actual).toBe(false);
	});

	it("returns false when the signing secret isn't set", () => {
		const timestamp = String(nowMs / 1000);
		const signature = sign(timestamp, body);
		vi.stubEnv("SLACK_SIGNING_SECRET", undefined);

		const actual = isFromSlack(body, signature, timestamp);

		expect(actual).toBe(false);
	});
});

describe(parseCommand, () => {
	it("returns the channel, text, and user when given a slash command body", () => {
		const actual = parseCommand(body);

		expect(actual).toEqual({
			channelId: "C0123456789",
			text: "random",
			userId: "U0123456789",
		});
	});

	it("returns empty strings when given a body without those fields", () => {
		const actual = parseCommand("command=force");

		expect(actual).toEqual({ channelId: "", text: "", userId: "" });
	});
});

describe(allowedForcers, () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("returns the IDs without surrounding space when given a list", () => {
		vi.stubEnv("SLACK_FORCE_USER_IDS", "U0123456789, U9876543210");

		const actual = allowedForcers();

		expect(actual).toEqual(new Set(["U0123456789", "U9876543210"]));
	});

	it("returns an empty set when the variable isn't set", () => {
		vi.stubEnv("SLACK_FORCE_USER_IDS", undefined);

		const actual = allowedForcers();

		expect(actual).toEqual(new Set());
	});
});
