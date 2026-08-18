import { WebClient } from "@slack/web-api";

import { Reaction } from "./types.js";
import { emojiNameToIndex, indexToEmojiName } from "./utils/entries.js";

export interface CreatePollOptions {
	choices: string[];
	prompt: string;
}

export interface PostMessageOptions {
	notify?: boolean;
	text: string;
}

const requireEnvironmentVariable = (name: string) => {
	const value = process.env[name];

	if (!value) {
		throw new Error(`Missing ${name}.`);
	}

	return value;
};

const createClient = () => ({
	channel: requireEnvironmentVariable("SLACK_CHANNEL"),
	client: new WebClient(requireEnvironmentVariable("SLACK_BOT_TOKEN")),
});

const postToChannel = async (
	{ channel, client }: ReturnType<typeof createClient>,
	{ notify, text }: PostMessageOptions,
) => {
	const response = await client.chat.postMessage({
		channel,
		text: notify ? `<!here> ${text}` : text,
	});

	// Slack keeps timestamps as equivalents to unique IDs for messages.
	// https://api.slack.com/messaging/retrieving#individual_messages
	const messageId = response.message?.ts;

	if (!messageId) {
		throw new Error(response.error ?? "Could not post message.");
	}

	return messageId;
};

export async function createPoll(options: CreatePollOptions) {
	"use step";

	const slack = createClient();

	const messageId = await postToChannel(slack, {
		notify: true,
		text: options.prompt,
	});

	for (let i = 0; i < options.choices.length; i += 1) {
		await slack.client.reactions.add({
			channel: slack.channel,
			name: indexToEmojiName[i],
			timestamp: messageId,
		});
	}

	return messageId;
}

export async function getReactions(messageId: string): Promise<Reaction[]> {
	"use step";

	const { channel, client } = createClient();

	const response = await client.reactions.get({
		channel,
		timestamp: messageId,
	});

	const reactions = response.message?.reactions;

	if (!reactions) {
		throw new Error(response.error ?? "Could not retrieve reactions.");
	}

	return reactions.flatMap(({ count, name }) => {
		if (
			count === undefined ||
			name === undefined ||
			!(name in emojiNameToIndex)
		) {
			return [];
		}

		// We reduce count by 1 since this bot gives 1 vote to every option
		return [{ count: Math.max(0, count - 1), index: emojiNameToIndex[name] }];
	});
}

export async function pinMessage(messageId: string) {
	"use step";

	const { channel, client } = createClient();

	await client.pins.add({ channel, timestamp: messageId });
}

export async function postMessage(options: PostMessageOptions) {
	"use step";

	return await postToChannel(createClient(), options);
}
