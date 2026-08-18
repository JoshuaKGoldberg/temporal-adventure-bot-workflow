import { Context, Hono } from "hono";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getHookByToken, resumeHook, start } from "workflow/api";

import { forceHookToken, gameHookToken, parseCommandText } from "./force.js";
import { runGame } from "./workflows.js";

const isFromSlack = (
	body: string,
	signature: null | string,
	timestamp: null | string,
) => {
	const signingSecret = process.env.SLACK_SIGNING_SECRET;

	if (!signingSecret || !timestamp || !signature) {
		return false;
	}

	// Reject replays of requests captured more than five minutes ago
	if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 60 * 5) {
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

const verify = (context: Context, body: string) =>
	isFromSlack(
		body,
		context.req.header("x-slack-signature") ?? null,
		context.req.header("x-slack-request-timestamp") ?? null,
	);

const hasRunningGame = async (channel: string) => {
	try {
		return !!(await getHookByToken(gameHookToken(channel)));
	} catch {
		// getHookByToken throws rather than returning null for unclaimed tokens
		return false;
	}
};

const app = new Hono();

app.get("/", (context) => context.text("Adventure bot is awake. 👋"));

app.post("/start", async (context) => {
	const body = await context.req.text();

	if (!verify(context, body)) {
		return context.text("Invalid request signature.", 401);
	}

	const channel = process.env.SLACK_CHANNEL;

	if (!channel) {
		return context.text("Missing SLACK_CHANNEL.", 500);
	}

	if (await hasRunningGame(channel)) {
		return context.text("A game is already running in this channel. 🎲");
	}

	const run = await start(runGame, ["begin", channel]);

	return context.text(`🎬 Off we go! Run ${run.runId}.`);
});

app.post("/force", async (context) => {
	const body = await context.req.text();

	if (!verify(context, body)) {
		return context.text("Invalid request signature.", 401);
	}

	const channel = process.env.SLACK_CHANNEL;

	if (!channel) {
		return context.text("Missing SLACK_CHANNEL.", 500);
	}

	const text = new URLSearchParams(body).get("text") ?? "";
	const forced = parseCommandText(text);

	if (forced === undefined) {
		return context.text(`I'm sorry, I don't understand '${text}'... 😖`);
	}

	try {
		await resumeHook(forceHookToken(channel), forced);
	} catch {
		return context.text("There's no poll waiting on a choice right now. 🤔");
	}

	return context.text(`👍 You got it! Going with *${String(forced)}*.`);
});

export default app;
