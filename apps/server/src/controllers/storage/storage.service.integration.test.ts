import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../storage", () => ({
	uploadBuffer: vi.fn(),
	createPresignedUrl: vi.fn(
		async (key: string) => `https://signed.example/${key}`,
	),
	deleteObject: vi.fn(),
	getPresignClient: vi.fn(),
	getS3Client: vi.fn(),
}));

import {
	MAX_FILES_PER_USER,
	MAX_UPLOAD_BYTES_PER_USER,
	type UploadFileInput,
} from "@repo/shared";
import { eq } from "drizzle-orm";
import { createTestUser } from "../../../tests/factories";
import { truncateTables } from "../../../tests/helpers/db.test-helper";
import { db } from "../../db/db";
import { files, users } from "../../db/schema";
import { handleFileUpload } from "./storage.service";

function fakeFile(size: number): UploadFileInput["file"] {
	return {
		size,
		name: "photo.png",
		type: "image/png",
		arrayBuffer: async () => new ArrayBuffer(0),
	} as unknown as UploadFileInput["file"];
}

async function seedFiles(
	userId: number,
	entries: { key: string; sizeBytes: number }[],
) {
	await db.insert(files).values(
		entries.map((entry) => ({
			key: entry.key,
			bucket: "test-bucket",
			fileName: "seed.png",
			contentType: "image/png",
			sizeBytes: entry.sizeBytes,
			createdBy: userId,
			updatedBy: userId,
		})),
	);
}

afterEach(async () => {
	await truncateTables(files, users);
});

describe("handleFileUpload quota", () => {
	it("accepts an upload when the user is under quota", async () => {
		const user = await createTestUser();

		const record = await handleFileUpload(
			{ id: user.id, uuid: user.uuid },
			fakeFile(1024),
		);

		expect(record).toHaveProperty("uuid");
		const rows = await db.query.files.findMany();
		expect(rows).toHaveLength(1);
	});

	it("rejects when the file-count limit is reached", async () => {
		const user = await createTestUser();
		await seedFiles(
			user.id,
			Array.from({ length: MAX_FILES_PER_USER }, (_, index) => ({
				key: `uploads/${user.uuid}/seed-${index}`,
				sizeBytes: 1024,
			})),
		);

		await expect(
			handleFileUpload({ id: user.id, uuid: user.uuid }, fakeFile(1024)),
		).rejects.toThrow(/Upload limit reached/);
	});

	it("rejects when the new file would exceed the total-bytes limit", async () => {
		const user = await createTestUser();
		await seedFiles(user.id, [
			{ key: `uploads/${user.uuid}/big`, sizeBytes: MAX_UPLOAD_BYTES_PER_USER },
		]);

		await expect(
			handleFileUpload({ id: user.id, uuid: user.uuid }, fakeFile(1024)),
		).rejects.toThrow(/Storage limit reached/);
	});

	it("does not count soft-deleted files toward the quota", async () => {
		const user = await createTestUser();
		await seedFiles(
			user.id,
			Array.from({ length: MAX_FILES_PER_USER }, (_, index) => ({
				key: `uploads/${user.uuid}/deleted-${index}`,
				sizeBytes: 1024,
			})),
		);
		await db
			.update(files)
			.set({ deletedAt: new Date() })
			.where(eq(files.createdBy, user.id));

		const record = await handleFileUpload(
			{ id: user.id, uuid: user.uuid },
			fakeFile(1024),
		);
		expect(record).toHaveProperty("uuid");
	});
});
