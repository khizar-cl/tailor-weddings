import { resolve } from "node:path";
import { coverageConfigDefaults, defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@repo/shared": resolve(import.meta.dirname, "../../packages/shared/src"),
			"@repo/orpc-contracts": resolve(
				import.meta.dirname,
				"../../packages/orpc-contracts/src",
			),
		},
	},
	test: {
		watch: false,
		globals: true,
		environment: "node",
		include: ["src/**/*.test.ts"],
		exclude: ["**/*.integration.test.ts"],
		passWithNoTests: false,
		coverage: {
			provider: "v8",
			reportsDirectory: "./coverage/unit",
			reporter: ["text", "json-summary", "lcov"],
			// Declarative Drizzle definitions and migrations are not unit-tested
			// (see docs/engineering/testing-patterns.md — don't test Drizzle
			// directly or type-level guarantees).
			exclude: [
				...coverageConfigDefaults.exclude,
				"src/db/schema/**",
				"src/db/migrations/**",
				"drizzle.config.ts",
			],
		},
	},
});
