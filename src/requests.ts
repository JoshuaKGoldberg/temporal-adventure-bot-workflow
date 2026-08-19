import { Context } from "hono";
import { createHmac, timingSafeEqual } from "node:crypto";

export interface SlackCommand {
	channelId: string;
	text: string;
	userId: string;
}

export const allowedForcers = () =>
	new Set(
		(process.env.SLACK_FORCE_USER_IDS ?? "")
			.split(",")
			.map((id) => id.trim())
			.filter(Boolean),
	);

export const isFromSlack = (
	body: string,
	signature: null | string,
	timestamp: null | string,
) => {
	const signingSecret = process.env.SLACK_SIGNING_SECRET;

	if (!signingSecret || !timestamp || !signature) {
		return false;
	}

	const sentAt = Number(timestamp);

	// Number("abc") is NaN and every NaN comparison is false, so without this a
	// non-numeric header would skip the replay window entirely.
	if (!Number.isFinite(sentAt)) {
		return false;
	}

	// Reject replays of requests captured more than five minutes ago
	if (Math.abs(Date.now() / 1000 - sentAt) > 60 * 5) {
		return false;
	}

	const expected = `v0=${createHmac("sha256", signingSecret)
		.update(`v0:${timestamp}:${body}`)
		.digest("hex")}`;

	const expectedBuffer = Buffer.from(expected);
	const signatureBuffer = Buffer.from(signature);

	return (
		expectedBuffer.length === signatureBuffer.length &&
		timingSafeEqual(expectedBuffer, signatureBuffer)
	);
};

export const parseCommand = (body: string): SlackCommand => {
	const params = new URLSearchParams(body);

	return {
		channelId: params.get("channel_id") ?? "",
		text: params.get("text") ?? "",
		userId: params.get("user_id") ?? "",
	};
};

export const verify = (context: Context, body: string) =>
	isFromSlack(
		body,
		context.req.header("x-slack-signature") ?? null,
		context.req.header("x-slack-request-timestamp") ?? null,
	);
