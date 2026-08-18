import { describe, expect, it } from "vitest";

import { GameOption } from "../types.js";
import { collectConsensus } from "./voting.js";

const options: GameOption[] = [
	{ description: "First", next: "first" },
	{ description: "Second", next: "second" },
	{ description: "Third", next: "third" },
];

describe(collectConsensus, () => {
	it("returns none when no option received a vote", () => {
		const actual = collectConsensus(options, [
			{ count: 0, index: 0 },
			{ count: 0, index: 1 },
		]);

		expect(actual).toBe("none");
	});

	it("returns tie when the top two options are even", () => {
		const actual = collectConsensus(options, [
			{ count: 2, index: 0 },
			{ count: 2, index: 1 },
		]);

		expect(actual).toBe("tie");
	});

	it("returns the leading option's next entry when one option leads", () => {
		const actual = collectConsensus(options, [
			{ count: 1, index: 0 },
			{ count: 3, index: 2 },
		]);

		expect(actual).toEqual({ choice: "third" });
	});

	it("returns none when the only reactions are outside the options", () => {
		const actual = collectConsensus(options, [{ count: 5, index: 9 }]);

		expect(actual).toBe("none");
	});
});
