export const settings = {
	/**
	 * How long to leave a poll open before checking for consensus.
	 */
	interval: "10m",

	/**
	 * Human-readable form of {@link settings.interval} for use in messages.
	 */
	intervalLabel: "10 minutes",
} as const;
