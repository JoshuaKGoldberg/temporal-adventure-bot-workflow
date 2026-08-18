export type ForceInput = "random" | number;

export type Game = Record<string, GameEntry>;

export interface GameEntry {
	description: string[];
	options?: GameOption[];
}

export interface GameOption {
	description: string;
	next: string;
}

export interface NextChoice {
	choice: string;
	forced?: ForceInput;
}

export interface Reaction {
	count: number;
	index: number;
}
