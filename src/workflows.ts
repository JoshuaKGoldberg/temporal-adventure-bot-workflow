import { createHook, sleep } from "workflow";

import {
	forceHookToken,
	gameHookToken,
	printEnded,
	printForced,
	printRejected,
} from "./force.js";
import { game } from "./game.js";
import { settings } from "./settings.js";
import {
	createPoll,
	getReactions,
	pinMessage,
	postMessage,
	unpinStaleInstructions,
} from "./slack.js";
import { ForceChoice, GameOption, PollInput } from "./types.js";
import { formatEntryData } from "./utils/entries.js";
import { collectConsensus } from "./utils/voting.js";

const announcementPrefix = ":wave: Hey everyone!";

const announcement = `
${announcementPrefix} We're going to be playing a little choose-your-own adventure game together! :raised_hands:

The game is simple:
1. :speech_balloon: Every ${settings.intervalLabel}, I'll post a game prompt in this channel describing where you are.
2. :ballot_box_with_ballot: That prompt will have >=2 next step options anybody can emoji react to vote on.
3. :ballot_box_with_check: After the voting period closes, I'll take the step with the most votes and post again, going back to step 1.
4. :checkered_flag: Eventually you'll finish the game -- and if you chose wisely, the ending will be a good one!

...and that's about it! :sunrise_over_mountains:

:arrow_right: *Let the game begin!*
`.trim();

// eslint-disable-next-line @typescript-eslint/require-await -- steps must be async
async function currentTimeMs() {
	"use step";

	return Date.now();
}

// eslint-disable-next-line @typescript-eslint/require-await -- steps must be async
async function pickRandomIndex(count: number) {
	"use step";

	return Math.floor(Math.random() * count);
}

const withinOptions = (choice: ForceChoice, options: GameOption[]) =>
	choice === "random" || (choice >= 1 && choice <= options.length);

export async function runGame(startingEntry: string, channel: string) {
	"use workflow";

	// Claiming this token registers the run as the channel's only game. Two
	// games in one channel would fight over the per-round force token.
	const gameHook = createHook({ token: gameHookToken(channel) });
	const conflict = await gameHook.getConflict();

	if (conflict) {
		return `already running as ${conflict.runId}`;
	}

	// Every game pins its own instructions, so without this each new game adds
	// another pin on top of every previous game's.
	await unpinStaleInstructions(announcementPrefix);

	const instructions = await postMessage({ text: announcement });

	await pinMessage(instructions);

	let entry = startingEntry;
	let firstPoll = true;

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
			notify: firstPoll,
			prompt: formatEntryData(game[entry]),
		});

		firstPoll = false;

		const next = await resolveChoice(poll, options, channel);

		// /end resumed the poll's hook, so the run stops here instead of at an
		// entry with no options of its own.
		if (next === undefined) {
			return "ended";
		}

		entry = next;
	}
}

async function resolveChoice(
	poll: string,
	options: GameOption[],
	channel: string,
) {
	for (;;) {
		// One deadline per voting round. Every wait below runs only until this
		// instant, so a rejected /force can't hand the round a fresh interval.
		const deadline = (await currentTimeMs()) + settings.intervalMs;

		for (;;) {
			const remaining = deadline - (await currentTimeMs());

			if (remaining <= 0) {
				break;
			}

			// A hook only lives for one wait. Reusing one leaves the losing side of
			// the race attached to it, which silently swallows a later /force.
			// The option count rides along so /force can range-check before
			// resuming, instead of the workflow rejecting a choice the route has
			// already confirmed.
			const forceHook = createHook<PollInput>({
				metadata: { optionCount: options.length },
				token: forceHookToken(channel),
			});

			const outcome = await Promise.race([
				forceHook.then((input) => ({ input })),
				sleep(remaining).then(() => ({ elapsed: true }) as const),
			]);

			forceHook.dispose();

			// Disposal only commits when the workflow suspends, so suspend before the
			// next wait registers the same token and conflicts with this one
			await sleep("1s");

			if (!("input" in outcome)) {
				break;
			}

			if ("end" in outcome.input) {
				await postMessage({ notify: true, text: printEnded(outcome.input) });

				return undefined;
			}

			if (!withinOptions(outcome.input.choice, options)) {
				await postMessage({
					text: printRejected(outcome.input, options.length),
				});
				continue;
			}

			await postMessage({ text: printForced(outcome.input) });

			const index =
				outcome.input.choice === "random"
					? await pickRandomIndex(options.length)
					: outcome.input.choice - 1;

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
