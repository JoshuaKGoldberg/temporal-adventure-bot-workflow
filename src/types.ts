export interface EndInput {
	end: true;
	userId: string;
}

export type ForceChoice = "random" | number;

export interface ForceInput {
	choice: ForceChoice;
	userId: string;
}

export interface ForwardInput {
	forward: true;
	userId: string;
}

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
	forced?: ForceChoice;
}

export type PollInput = EndInput | ForceInput | ForwardInput;

export interface Reaction {
	count: number;
	index: number;
}
