import { ORPCError } from "@orpc/server";
import type {
	PublishVendorInputSchema,
	UpsertVendorInputSchema,
	VendorByUuidInputSchema,
	VendorDetailSchema,
	VendorListInputSchema,
	VendorListPageSchema,
} from "@repo/shared";
import { and, asc, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { files, servicePackages, vendorImages, vendors } from "../../db";
import { db } from "../../db/db";
import { createPresignedUrl } from "../../storage";

type DbUser = { id: number; uuid: string };

const vendorDetailWith = {
	logoFile: true,
	images: {
		orderBy: asc(vendorImages.sortOrder),
		with: { file: true },
	},
	packages: {
		where: isNull(servicePackages.deletedAt),
		orderBy: asc(servicePackages.sortOrder),
	},
} as const;

type VendorRow = NonNullable<
	Awaited<
		ReturnType<
			typeof db.query.vendors.findFirst<{ with: typeof vendorDetailWith }>
		>
	>
>;

async function viewUrl(file: {
	key: string;
	fileName: string;
	deletedAt: Date | null;
}): Promise<string | null> {
	if (file.deletedAt) {
		return null;
	}
	return createPresignedUrl(file.key, file.fileName, "view");
}

async function toVendorDetail(row: VendorRow): Promise<VendorDetailSchema> {
	const logoUrl = row.logoFile ? await viewUrl(row.logoFile) : null;

	const images = (
		await Promise.all(
			row.images.map(async (image) => {
				const url = await viewUrl(image.file);
				return url
					? { uuid: image.uuid, url, sortOrder: image.sortOrder }
					: null;
			}),
		)
	).filter((image): image is NonNullable<typeof image> => image !== null);

	return {
		uuid: row.uuid,
		businessName: row.businessName,
		category: row.category,
		tagline: row.tagline,
		description: row.description,
		logoUrl,
		images,
		packages: row.packages.map((pkg) => ({
			uuid: pkg.uuid,
			name: pkg.name,
			description: pkg.description,
			priceCents: pkg.priceCents,
			sortOrder: pkg.sortOrder,
		})),
		isPublished: row.isPublished,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

async function findOwnVendorRow(userId: number) {
	return db.query.vendors.findFirst({
		where: and(eq(vendors.userId, userId), isNull(vendors.deletedAt)),
		with: vendorDetailWith,
	});
}

/**
 * Resolve caller-supplied file uuids to their integer ids, verifying each file
 * exists, is not deleted, and belongs to the caller.
 */
async function resolveOwnedFileIds(
	dbUser: DbUser,
	fileUuids: string[],
): Promise<Map<string, number>> {
	const unique = [...new Set(fileUuids)];
	if (unique.length === 0) {
		return new Map();
	}

	const rows = await db.query.files.findMany({
		where: and(inArray(files.uuid, unique), isNull(files.deletedAt)),
		columns: { id: true, uuid: true, createdBy: true },
	});

	const byUuid = new Map(rows.map((row) => [row.uuid, row]));

	for (const uuid of unique) {
		const file = byUuid.get(uuid);
		if (!file) {
			throw new ORPCError("NOT_FOUND", { message: "File not found" });
		}
		if (file.createdBy !== dbUser.id) {
			throw new ORPCError("FORBIDDEN", {
				message: "You can only attach your own files",
			});
		}
	}

	return new Map([...byUuid].map(([uuid, row]) => [uuid, row.id]));
}

export async function upsertMine(
	dbUser: DbUser,
	input: UpsertVendorInputSchema,
): Promise<VendorDetailSchema> {
	const logoUuids = input.logoFileUuid ? [input.logoFileUuid] : [];
	const fileIds = await resolveOwnedFileIds(dbUser, [
		...logoUuids,
		...input.imageFileUuids,
	]);

	const logoFileId = input.logoFileUuid
		? (fileIds.get(input.logoFileUuid) ?? null)
		: null;

	await db.transaction(async (tx) => {
		const [vendorRow] = await tx
			.insert(vendors)
			.values({
				userId: dbUser.id,
				businessName: input.businessName,
				category: input.category,
				tagline: input.tagline ?? null,
				description: input.description ?? null,
				logoFileId,
				createdBy: dbUser.id,
				updatedBy: dbUser.id,
			})
			.onConflictDoUpdate({
				target: vendors.userId,
				set: {
					businessName: input.businessName,
					category: input.category,
					tagline: input.tagline ?? null,
					description: input.description ?? null,
					logoFileId,
					updatedBy: dbUser.id,
					updatedAt: new Date(),
				},
			})
			.returning({ id: vendors.id });

		if (!vendorRow) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to save vendor profile",
			});
		}

		await tx
			.delete(vendorImages)
			.where(eq(vendorImages.vendorId, vendorRow.id));
		if (input.imageFileUuids.length > 0) {
			await tx.insert(vendorImages).values(
				input.imageFileUuids.map((uuid, index) => ({
					vendorId: vendorRow.id,
					// resolveOwnedFileIds already validated every uuid is present.
					fileId: fileIds.get(uuid) as number,
					sortOrder: index,
					createdBy: dbUser.id,
					updatedBy: dbUser.id,
				})),
			);
		}

		await tx
			.delete(servicePackages)
			.where(eq(servicePackages.vendorId, vendorRow.id));
		if (input.packages.length > 0) {
			await tx.insert(servicePackages).values(
				input.packages.map((pkg, index) => ({
					vendorId: vendorRow.id,
					name: pkg.name,
					description: pkg.description ?? null,
					priceCents: pkg.priceCents,
					sortOrder: pkg.sortOrder ?? index,
					createdBy: dbUser.id,
					updatedBy: dbUser.id,
				})),
			);
		}
	});

	const row = await findOwnVendorRow(dbUser.id);
	if (!row) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to load vendor profile",
		});
	}
	return toVendorDetail(row);
}

export async function getMine(
	dbUser: DbUser,
): Promise<VendorDetailSchema | null> {
	const row = await findOwnVendorRow(dbUser.id);
	return row ? toVendorDetail(row) : null;
}

export async function publish(
	dbUser: DbUser,
	input: PublishVendorInputSchema,
): Promise<VendorDetailSchema> {
	const row = await findOwnVendorRow(dbUser.id);
	if (!row) {
		throw new ORPCError("NOT_FOUND", {
			message: "Create your profile before publishing",
		});
	}

	if (input.publish && row.packages.length === 0) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Add at least one service package before publishing",
		});
	}

	await db
		.update(vendors)
		.set({
			isPublished: input.publish,
			updatedBy: dbUser.id,
			updatedAt: new Date(),
		})
		.where(eq(vendors.id, row.id));

	const updated = await findOwnVendorRow(dbUser.id);
	if (!updated) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Failed to load vendor profile",
		});
	}
	return toVendorDetail(updated);
}

export async function list(
	input: VendorListInputSchema,
): Promise<VendorListPageSchema> {
	const cursorId = input.cursor ? Number(input.cursor) : undefined;

	const conditions = [isNull(vendors.deletedAt), eq(vendors.isPublished, true)];
	if (input.category) {
		conditions.push(eq(vendors.category, input.category));
	}
	if (cursorId !== undefined && Number.isFinite(cursorId)) {
		conditions.push(lt(vendors.id, cursorId));
	}

	const rows = await db.query.vendors.findMany({
		where: and(...conditions),
		orderBy: desc(vendors.id),
		limit: input.limit + 1,
		with: { logoFile: true },
	});

	const pageRows = rows.slice(0, input.limit);
	const nextCursor =
		rows.length > input.limit
			? String(pageRows[pageRows.length - 1]?.id)
			: null;

	const vendorIds = pageRows.map((row) => row.id);
	const priceRows =
		vendorIds.length > 0
			? await db
					.select({
						vendorId: servicePackages.vendorId,
						fromPriceCents: sql<number>`min(${servicePackages.priceCents})`,
					})
					.from(servicePackages)
					.where(
						and(
							inArray(servicePackages.vendorId, vendorIds),
							isNull(servicePackages.deletedAt),
						),
					)
					.groupBy(servicePackages.vendorId)
			: [];
	const priceByVendorId = new Map(
		priceRows.map((row) => [row.vendorId, Number(row.fromPriceCents)]),
	);

	const items = await Promise.all(
		pageRows.map(async (row) => ({
			uuid: row.uuid,
			businessName: row.businessName,
			category: row.category,
			tagline: row.tagline,
			logoUrl: row.logoFile ? await viewUrl(row.logoFile) : null,
			fromPriceCents: priceByVendorId.get(row.id) ?? null,
		})),
	);

	return { items, nextCursor };
}

export async function getByUuid(
	input: VendorByUuidInputSchema,
): Promise<VendorDetailSchema> {
	const row = await db.query.vendors.findFirst({
		where: and(
			eq(vendors.uuid, input.uuid),
			eq(vendors.isPublished, true),
			isNull(vendors.deletedAt),
		),
		with: vendorDetailWith,
	});

	if (!row) {
		throw new ORPCError("NOT_FOUND", { message: "Vendor not found" });
	}
	return toVendorDetail(row);
}
