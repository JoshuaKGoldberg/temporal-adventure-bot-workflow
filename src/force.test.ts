import { describe, expect, it } from "vitest";

import {
	forceHookToken,
	parseCommandText,
	printForced,
	printRejected,
	readOptionCount,
} from "./force.js";

describe(parseCommandText, () => {
	it("returns random when given random", () => {
		const actual = parseCommandText("random");

		expect(actual).toBe("random");
	});

	it("returns the same number when given a numeric string", () => {
		const actual = parseCommandText("2");

		expect(actual).toBe(2);
	});

	it("returns the number when given a numeric string with surrounding space", () => {
		const actual = parseCommandText(" 2 ");

		expect(actual).toBe(2);
	});

	it("returns undefined when given text that isn't a number", () => {
		const actual = parseCommandText("banana");

		expect(actual).toBeUndefined();
	});

	it("returns undefined when given zero", () => {
		const actual = parseCommandText("0");

		expect(actual).toBeUndefined();
	});

	it("returns undefined when given a negative number", () => {
		const actual = parseCommandText("-1");

		expect(actual).toBeUndefined();
	});

	it("returns undefined when given a number followed by other text", () => {
		const actual = parseCommandText("2abc");

		expect(actual).toBeUndefined();
	});

	it("returns undefined when given exponent notation", () => {
		const actual = parseCommandText("1e3");

		expect(actual).toBeUndefined();
	});
});

describe(printForced, () => {
	it("prints the first emoji and the forcing user when given one", () => {
		const actual = printForced({ choice: 1, userId: "U0123456789" });

		expect(actual).toContain(":one:");
		expect(actual).toContain("<@U0123456789>");
	});

	it("prints randomly when given random", () => {
		const actual = printForced({ choice: "random", userId: "U0123456789" });

		expect(actual).toContain("randomly");
	});
});

describe(printRejected, () => {
	it("prints the choice, the option count, and the forcing user", () => {
		const actual = printRejected({ choice: 99, userId: "U0123456789" }, 3);

		expect(actual).toContain("*99*");
		expect(actual).toContain("3 options");
		expect(actual).toContain("<@U0123456789>");
	});
});

describe(readOptionCount, () => {
	it("returns the count when given metadata containing one", () => {
		const actual = readOptionCount({ optionCount: 3 });

		expect(actual).toBe(3);
	});

	it("returns undefined when given metadata without a count", () => {
		const actual = readOptionCount({ other: true });

		expect(actual).toBeUndefined();
	});

	it("returns undefined when given a non-numeric count", () => {
		const actual = readOptionCount({ optionCount: "3" });

		expect(actual).toBeUndefined();
	});

	it("returns undefined when given no metadata", () => {
		const actual = readOptionCount(undefined);

		expect(actual).toBeUndefined();
	});
});

describe(forceHookToken, () => {
	it("includes the channel so the route can reconstruct it", () => {
		const actual = forceHookToken("C0123456789");

		expect(actual).toBe("force:C0123456789");
	});
});
