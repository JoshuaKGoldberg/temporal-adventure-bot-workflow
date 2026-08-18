import { createHook, sleep } from "workflow";

import { forceHookToken, gameHookToken, printForced } from "./force.js";
import { game } from "./game.js";
import { settings } from "./settings.js";
import { createPoll, getReactions, pinMessage, postMessage } from "./slack.js";
import { ForceInput, GameOption } from "./types.js";
import { formatEntryData } from "./utils/entries.js";
import { collectConsensus } from "./utils/voting.js";

const announcement = `
:wave: Hey everyone! We're going to be playing a little choose-your-own adventure game together! :raised_hands:

The game is simple:
1. :speech_balloon: Every so often, I'll post a game prompt in this channel describing where you are.
2. :ballot_box_with_ballot: That prompt will have >=2 next step options anybody can emoji react to vote on.
3. :ballot_box_with_check: After the voting period closes, I'll take the step with the most votes and post again, going back to step 1.
4. :checkered_flag: Eventually you'll finish the game -- and if you chose wisely, the ending will be a good one!

...and that's about it! :sunrise_over_mountains:

:arrow_right: *Let the game begin!*
`.trim();

// eslint-disable-next-line @typescript-eslint/require-await -- steps must be async
async function pickRandomIndex(count: number) {
	"use step";

	return Math.floor(Math.random() * count);
}

const withinOptions = (forced: ForceInput, options: GameOption[]) =>
	forced === "random" || (forced >= 1 && forced <= options.length);

export async function runGame(startingEntry: string, channel: string) {
	"use workflow";

	// Claiming this token registers the run as the channel's only game. Two
	// games in one channel would fight over the per-round force token.
	const gameHook = createHook({ token: gameHookToken(channel) });
	const conflict = await gameHook.getConflict();

	if (conflict) {
		return `already running as ${conflict.runId}`;
	}

	const instructions = await postMessage({ text: announcement });

	await pinMessage(instructions);

	let entry = startingEntry;

	for (;;) {
		const { options } = game[entry];

		if (!options) {
			await postMessage({
				notify: true,
				text: `
${game[entry].description.join("\n")}
...and, that's the end of the game. Thanks for playing everyone! :end:
`.trim(),
			});

			return entry;
		}

		const poll = await createPoll({
			choices: options.map((option) => option.description),
			prompt: formatEntryData(game[entry]),
		});

		const next = await resolveChoice(poll, options, channel);

		entry = next;
	}
}

async function resolveChoice(
	poll: string,
	options: GameOption[],
	channel: string,
) {
	for (;;) {
		// A hook only lives for one round. Reusing one leaves the losing side of
		// the race attached to it, which silently swallows a later /force.
		const forceHook = createHook<ForceInput>({
			token: forceHookToken(channel),
		});

		const outcome = await Promise.race([
			forceHook.then((forced) => ({ forced })),
			sleep(settings.interval).then(() => ({ elapsed: true }) as const),
		]);

		forceHook.dispose();

		// Disposal only commits when the workflow suspends, so suspend before the
		// next round registers the same token and conflicts with this one
		await sleep("1s");

		if ("forced" in outcome) {
			if (!withinOptions(outcome.forced, options)) {
				continue;
			}

			await postMessage({ text: printForced(outcome.forced) });

			const index =
				outcome.forced === "random"
					? await pickRandomIndex(options.length)
					: outcome.forced - 1;

			return options[index].next;
		}

		const consensus = collectConsensus(options, await getReactions(poll));

		switch (consensus) {
			case "none":
				await postMessage({
					text: `Well, nobody posted, so... waiting another ${settings.intervalLabel}!`,
				});
				break;

			case "tie":
				await postMessage({
					text: `Looks like there's a tie! Waiting another ${settings.intervalLabel} for you make up your minds.`,
				});
				break;

			default:
				return consensus.choice;
		}
	}
}
