import { resolve } from "node:path";
import { config } from "dotenv";
import { coverageConfigDefaults, defineConfig } from "vitest/config";

config();

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
		env: { NODE_ENV: "test" },
		include: ["src/**/*.integration.test.ts"],
		passWithNoTests: false,
		fileParallelism: false,
		globalSetup: "./vitest.global-setup.ts",
		setupFiles: ["./tests/helpers/setup.test-helper.ts"],
		coverage: {
			provider: "v8",
			reportsDirectory: "./coverage/integration",
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
