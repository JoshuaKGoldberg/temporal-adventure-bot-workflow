import { GameEntry } from "../types.js";

export const indexToEmojiName = [
	"one",
	"two",
	"three",
	"four",
	"five",
	"six",
	"seven",
];

export const emojiNameToIndex = Object.fromEntries(
	indexToEmojiName.map((emoji, index) => [emoji, index] as const),
);

export function formatEntryData(entry: GameEntry) {
	if (!entry.options) {
		return entry.description.join("\n");
	}

	return [
		...entry.description,
		"",
		"Options:",
		...entry.options.map(
			(option, i) => `- :${indexToEmojiName[i]}:: ${option.description}`,
		),
	].join("\n");
}
