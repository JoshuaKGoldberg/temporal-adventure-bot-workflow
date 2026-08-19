import { Context, Hono } from "hono";
import { getHookByToken, resumeHook, start } from "workflow/api";

import {
	forceHookToken,
	gameHookToken,
	parseCommandText,
	readOptionCount,
} from "./force.js";
import {
	allowedForcers,
	parseCommand,
	SlackCommand,
	verify,
} from "./requests.js";
import { runGame } from "./workflows.js";

const currentOptionCount = async (channel: string) => {
	try {
		const hook = await getHookByToken(forceHookToken(channel));

		return readOptionCount(hook.metadata);
	} catch {
		// No poll is waiting; resumeHook reports that to the user below
		return undefined;
	}
};

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

/**
 * Slack only renders a slash command's response body on a 2xx, and shows its
 * own generic failure otherwise, so refusals a real user should read are 200s.
 * The body is ephemeral by default, visible only to whoever sent the command.
 */
const refuse = (context: Context, text: string) => context.text(text);

const readCommand = (context: Context, body: string) => {
	// An unsigned request isn't a Slack user waiting to read a reply, so this is
	// the one refusal that stays a non-2xx.
	if (!verify(context, body)) {
		return { failure: context.text("Invalid request signature.", 401) };
	}

	const channel = process.env.SLACK_CHANNEL;

	if (!channel) {
		console.error("Missing SLACK_CHANNEL.");

		return {
			failure: refuse(context, "I'm not set up with a channel yet. 🛠️"),
		};
	}

	const command = parseCommand(body);

	// The game only ever runs in SLACK_CHANNEL, so a command sent from anywhere
	// else, including a DM, must not be able to drive it.
	if (command.channelId !== channel) {
		return {
			failure: refuse(
				context,
				"Adventure bot only plays in its own channel. 🙅",
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
		console.error("Missing SLACK_FORCE_USER_IDS.");

		return refuse(context, "Nobody is set up to force choices. 🛠️");
	}

	if (!forcers.has(request.command.userId)) {
		logCommand("force-denied", request.command);

		return refuse(context, "Only an adventure admin can force a choice. 🙅");
	}

	logCommand("force", request.command);

	const choice = parseCommandText(request.command.text);

	if (choice === undefined) {
		return context.text(
			`I'm sorry, I don't understand '${request.command.text}'... 😖`,
		);
	}

	const optionCount = await currentOptionCount(request.channel);

	// Only the running poll knows how many options it has, so the route can
	// range-check a number once the hook has told it.
	if (
		typeof choice === "number" &&
		optionCount !== undefined &&
		choice > optionCount
	) {
		return refuse(
			context,
			`This poll only has ${String(optionCount)} options. 🙅`,
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

	return context.text(`👍 You got it! Passing *${String(choice)}* along.`);
});

export default app;
