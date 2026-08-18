import { describe, expect, it } from "vitest";

import { forceHookToken, parseCommandText, printForced } from "./force.js";

describe(parseCommandText, () => {
	it("returns random when given random", () => {
		const actual = parseCommandText("random");

		expect(actual).toBe("random");
	});

	it("returns the same number when given a numeric string", () => {
		const actual = parseCommandText("2");

		expect(actual).toBe(2);
	});

	it("returns undefined when given text that isn't a number", () => {
		const actual = parseCommandText("banana");

		expect(actual).toBeUndefined();
	});
});

describe(printForced, () => {
	it("prints the first emoji when given one", () => {
		const actual = printForced(1);

		expect(actual).toContain(":one:");
	});

	it("prints randomly when given random", () => {
		const actual = printForced("random");

		expect(actual).toContain("randomly");
	});
});

describe(forceHookToken, () => {
	it("includes the channel so the route can reconstruct it", () => {
		const actual = forceHookToken("C0123456789");

		expect(actual).toBe("force:C0123456789");
	});
});
