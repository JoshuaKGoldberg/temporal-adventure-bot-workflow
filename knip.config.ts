import type { KnipConfig } from "knip";

export default {
	entry: ["src/index.ts", "src/**/*.test.*"],
	ignoreExportsUsedInFile: { interface: true, type: true },
	project: ["src/**/*.ts"],
	treatConfigHintsAsErrors: true,
} satisfies KnipConfig;
