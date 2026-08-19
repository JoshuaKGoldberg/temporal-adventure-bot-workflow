import { Context, Hono } from "hono";
import { getHookByToken, resumeHook, start } from "workflow/api";

import { forceHookToken, gameHookToken, parseCommandText } from "./force.js";
import {
	allowedForcers,
	parseCommand,
	SlackCommand,
	verify,
} from "./requests.js";
import { runGame } from "./workflows.js";

const hasRunningGame = async (channel: string) => {
	try {
		return !!(await getHookByToken(gameHookToken(channel)));
	} catch {
		// getHookByToken throws rather than returning null for unclaimed tokens
		return false;
	}
};

const logCommand = (
	at: "force" | "force-denied" | "start",
	{ channelId, text, userId }: SlackCommand,
) => {
	console.log(JSON.stringify({ at, channel: channelId, text, user: userId }));
};

const readCommand = (context: Context, body: string) => {
	if (!verify(context, body)) {
		return { failure: context.text("Invalid request signature.", 401) };
	}

	const channel = process.env.SLACK_CHANNEL;

	if (!channel) {
		return { failure: context.text("Missing SLACK_CHANNEL.", 500) };
	}

	const command = parseCommand(body);

	// The game only ever runs in SLACK_CHANNEL, so a command sent from anywhere
	// else, including a DM, must not be able to drive it.
	if (command.channelId !== channel) {
		return {
			failure: context.text(
				"Adventure bot only plays in its own channel. 🙅",
				403,
			),
		};
	}

	return { channel, command };
};

const app = new Hono();

app.get("/", (context) => context.text("Adventure bot is awake. 👋"));

app.post("/start", async (context) => {
	const body = await context.req.text();
	const request = readCommand(context, body);

	if ("failure" in request) {
		return request.failure;
	}

	logCommand("start", request.command);

	if (await hasRunningGame(request.channel)) {
		return context.text("A game is already running in this channel. 🎲");
	}

	const run = await start(runGame, ["begin", request.channel]);

	return context.text(`🎬 Off we go! Run ${run.runId}.`);
});

app.post("/force", async (context) => {
	const body = await context.req.text();
	const request = readCommand(context, body);

	if ("failure" in request) {
		return request.failure;
	}

	const forcers = allowedForcers();

	// Fail closed: an empty allowlist is a misconfiguration, not permission for
	// the whole workspace to override votes.
	if (forcers.size === 0) {
		return context.text("Missing SLACK_FORCE_USER_IDS.", 500);
	}

	if (!forcers.has(request.command.userId)) {
		logCommand("force-denied", request.command);

		return context.text("Only an adventure admin can force a choice. 🙅", 403);
	}

	logCommand("force", request.command);

	const choice = parseCommandText(request.command.text);

	if (choice === undefined) {
		return context.text(
			`I'm sorry, I don't understand '${request.command.text}'... 😖`,
		);
	}

	try {
		await resumeHook(forceHookToken(request.channel), {
			choice,
			userId: request.command.userId,
		});
	} catch {
		return context.text("There's no poll waiting on a choice right now. 🤔");
	}

	return context.text(`👍 You got it! Going with *${String(choice)}*.`);
});

export default app;
