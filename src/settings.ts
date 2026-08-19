export const settings = {
	/**
	 * Human-readable form of {@link settings.intervalMs} for use in messages.
	 */
	intervalLabel: "10 minutes",

	/**
	 * How long to leave a poll open before checking for consensus.
	 */
	intervalMs: 10 * 60 * 1000,
} as const;
