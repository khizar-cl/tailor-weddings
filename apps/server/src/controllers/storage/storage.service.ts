import { randomUUID } from "node:crypto";
import { ORPCError } from "@orpc/server";
import {
	MAX_FILE_SIZE_BYTES,
	MAX_FILES_PER_USER,
	MAX_UPLOAD_BYTES_PER_USER,
	type UploadFileInput,
} from "@repo/shared";
import { and, count, eq, isNull, sql } from "drizzle-orm";
import { files } from "../../db";
import { db } from "../../db/db";
import { createPresignedUrl, deleteObject, uploadBuffer } from "../../storage";
import { env } from "../../utils/env";

type DbUser = { id: number; uuid: string };

/**
 * Enforce the per-user storage quota before accepting an upload. Throws
 * FORBIDDEN when the account is already at its file-count cap or the new file
 * would push it over the total-bytes cap. Soft-deleted files are excluded.
 */
async function assertWithinUploadQuota(userId: number, incomingBytes: number) {
	const [usage] = await db
		.select({
			fileCount: count(),
			totalBytes: sql<number>`coalesce(sum(${files.sizeBytes}), 0)`,
		})
		.from(files)
		.where(and(eq(files.createdBy, userId), isNull(files.deletedAt)));

	const fileCount = usage?.fileCount ?? 0;
	const totalBytes = Number(usage?.totalBytes ?? 0);

	if (fileCount >= MAX_FILES_PER_USER) {
		throw new ORPCError("FORBIDDEN", {
			message: "Upload limit reached. Delete some files to free up space.",
		});
	}
	if (totalBytes + incomingBytes > MAX_UPLOAD_BYTES_PER_USER) {
		throw new ORPCError("FORBIDDEN", {
			message: "Storage limit reached. Delete some files to free up space.",
		});
	}
}

export async function handleFileUpload(
	dbUser: DbUser,
	file: UploadFileInput["file"],
) {
	if (file.size > MAX_FILE_SIZE_BYTES) {
		throw new ORPCError("PAYLOAD_TOO_LARGE", {
			message: `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`,
		});
	}

	await assertWithinUploadQuota(dbUser.id, file.size);

	const extension = file.name.includes(".")
		? file.name.substring(file.name.lastIndexOf("."))
		: "";
	const key = `uploads/${dbUser.uuid}/${randomUUID()}${extension}`;

	const arrayBuffer = await file.arrayBuffer();
	await uploadBuffer(
		key,
		Buffer.from(arrayBuffer),
		file.type || "application/octet-stream",
	);

	const [record] = await db
		.insert(files)
		.values({
			key,
			bucket: env.S3_BUCKET,
			fileName: file.name,
			contentType: file.type || "application/octet-stream",
			sizeBytes: file.size,
			createdBy: dbUser.id,
			updatedBy: dbUser.id,
		})
		.returning();

	if (!record) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to save file record",
		});
	}

	return {
		uuid: record.uuid,
		fileName: record.fileName,
		contentType: record.contentType,
		sizeBytes: record.sizeBytes,
		createdBy: dbUser.uuid,
		createdAt: record.createdAt,
		updatedBy: dbUser.uuid,
		updatedAt: record.updatedAt,
		deletedAt: record.deletedAt,
	};
}

export async function getFileUrl(
	dbUser: DbUser,
	input: { uuid: string; mode: "view" | "download" },
) {
	const file = await db.query.files.findFirst({
		where: eq(files.uuid, input.uuid),
	});

	if (!file || file.deletedAt) {
		throw new ORPCError("NOT_FOUND", { message: "File not found" });
	}

	if (file.createdBy !== dbUser.id) {
		throw new ORPCError("FORBIDDEN", {
			message: "You can only access your own files",
		});
	}

	const url = await createPresignedUrl(file.key, file.fileName, input.mode);
	return { url };
}

export async function listUserFiles(dbUser: DbUser) {
	const userFiles = await db.query.files.findMany({
		where: (files, { eq, and, isNull }) =>
			and(eq(files.createdBy, dbUser.id), isNull(files.deletedAt)),
		orderBy: (files, { desc }) => [desc(files.createdAt)],
	});

	return {
		files: userFiles.map((f) => ({
			uuid: f.uuid,
			fileName: f.fileName,
			contentType: f.contentType,
			sizeBytes: f.sizeBytes,
			createdBy: dbUser.uuid,
			createdAt: f.createdAt,
			updatedBy: dbUser.uuid,
			updatedAt: f.updatedAt,
			deletedAt: f.deletedAt,
		})),
	};
}

export async function softDeleteFile(dbUser: DbUser, input: { uuid: string }) {
	const file = await db.query.files.findFirst({
		where: eq(files.uuid, input.uuid),
	});

	if (!file || file.deletedAt) {
		throw new ORPCError("NOT_FOUND", { message: "File not found" });
	}

	if (file.createdBy !== dbUser.id) {
		throw new ORPCError("FORBIDDEN", {
			message: "You can only delete your own files",
		});
	}

	// Soft-delete the metadata row first — if this fails, S3 is untouched and recoverable
	await db
		.update(files)
		.set({
			deletedAt: new Date(),
			updatedBy: dbUser.id,
			updatedAt: new Date(),
		})
		.where(eq(files.uuid, input.uuid));

	// Remove from S3 after DB is committed
	await deleteObject(file.key);

	return { deleted: true };
}
