import { eq } from "drizzle-orm";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../storage", () => ({
	createPresignedUrl: vi.fn(
		async (key: string) => `https://signed.example/${key}`,
	),
	deleteObject: vi.fn(),
	uploadBuffer: vi.fn(),
	getPresignClient: vi.fn(),
	getS3Client: vi.fn(),
}));

import { createTestUser } from "../../../tests/factories";
import {
	createTestApp,
	withAuth,
} from "../../../tests/helpers/app.test-helper";
import { truncateTables } from "../../../tests/helpers/db.test-helper";
import { db } from "../../db/db";
import {
	files,
	servicePackages,
	users,
	vendorImages,
	vendors,
} from "../../db/schema";

const app = createTestApp();

function rpcBody(res: request.Response) {
	return res.body && typeof res.body === "object" && "json" in res.body
		? res.body.json
		: res.body;
}

function post(path: string, userId: string, input?: unknown) {
	const req = withAuth(request(app).post(`/rpc/${path}`), userId);
	if (input !== undefined) {
		return req
			.set("Content-Type", "application/json")
			.send(JSON.stringify({ json: input }));
	}
	return req;
}

async function createVendorUser(suffix: string) {
	return createTestUser({
		clerkId: `user_vendor_${suffix}`,
		email: `vendor_${suffix}@example.com`,
		name: `Vendor ${suffix}`,
		role: "vendor",
	});
}

async function createOwnedFile(ownerId: number, key: string) {
	const [file] = await db
		.insert(files)
		.values({
			key,
			bucket: "test-bucket",
			fileName: "logo.png",
			contentType: "image/png",
			sizeBytes: 1024,
			createdBy: ownerId,
			updatedBy: ownerId,
		})
		.returning();
	return file!;
}

const basePackage = { name: "Standard", priceCents: 150000, sortOrder: 0 };

const baseProfile = {
	businessName: "Evergreen Studio",
	category: "photography" as const,
	packages: [basePackage],
	imageFileUuids: [] as string[],
};

afterEach(async () => {
	await truncateTables(vendorImages, servicePackages, files, vendors, users);
});

describe("vendor.upsertMine", () => {
	it("creates a profile for a vendor and hides the integer id", async () => {
		await createVendorUser("a");

		const res = await post("vendor/upsertMine", "user_vendor_a", baseProfile);
		expect(res.status).toBe(200);

		const body = rpcBody(res);
		expect(body).toMatchObject({
			businessName: "Evergreen Studio",
			category: "photography",
			isPublished: false,
		});
		expect(body).toHaveProperty("uuid");
		expect(body).not.toHaveProperty("id");
		expect(body.packages).toHaveLength(1);
		expect(body.packages[0]).toMatchObject({
			name: "Standard",
			priceCents: 150000,
		});
	});

	it("updates the caller's single profile and replaces packages", async () => {
		await createVendorUser("a");

		await post("vendor/upsertMine", "user_vendor_a", baseProfile).expect(200);
		const updated = await post("vendor/upsertMine", "user_vendor_a", {
			...baseProfile,
			businessName: "Evergreen Weddings",
			packages: [
				{ name: "Basic", priceCents: 100000, sortOrder: 0 },
				{ name: "Premium", priceCents: 250000, sortOrder: 1 },
			],
		}).expect(200);

		expect(rpcBody(updated).businessName).toBe("Evergreen Weddings");
		expect(rpcBody(updated).packages).toHaveLength(2);

		const rows = await db.query.vendors.findMany();
		expect(rows).toHaveLength(1);
	});

	it("returns 401 without auth", async () => {
		const res = await request(app)
			.post("/rpc/vendor/upsertMine")
			.set("Content-Type", "application/json")
			.send(JSON.stringify({ json: baseProfile }));
		expect(res.status).toBe(401);
	});

	it("returns 403 for a non-vendor member", async () => {
		await createTestUser({
			clerkId: "user_member",
			email: "member@example.com",
			role: "member",
		});
		const res = await post("vendor/upsertMine", "user_member", baseProfile);
		expect(res.status).toBe(403);
	});

	it("returns 403 when attaching a file owned by another user", async () => {
		const owner = await createVendorUser("a");
		await createVendorUser("b");
		const otherFile = await createOwnedFile(owner.id, "uploads/a/logo.png");

		const res = await post("vendor/upsertMine", "user_vendor_b", {
			...baseProfile,
			logoFileUuid: otherFile.uuid,
		});
		expect(res.status).toBe(403);
	});

	it("returns 404 when attaching a non-existent file", async () => {
		await createVendorUser("a");
		const res = await post("vendor/upsertMine", "user_vendor_a", {
			...baseProfile,
			logoFileUuid: "00000000-0000-0000-0000-000000000000",
		});
		expect(res.status).toBe(404);
	});

	it("rejects more than the max number of portfolio images", async () => {
		await createVendorUser("a");
		const tooManyImages = Array.from(
			{ length: 21 },
			() => "00000000-0000-0000-0000-000000000000",
		);
		const res = await post("vendor/upsertMine", "user_vendor_a", {
			...baseProfile,
			imageFileUuids: tooManyImages,
		});
		expect(res.status).toBe(400);
	});

	it("rejects more than the max number of service packages", async () => {
		await createVendorUser("a");
		const tooManyPackages = Array.from({ length: 21 }, (_, index) => ({
			name: `Package ${index}`,
			priceCents: 1000,
			sortOrder: index,
		}));
		const res = await post("vendor/upsertMine", "user_vendor_a", {
			...baseProfile,
			packages: tooManyPackages,
		});
		expect(res.status).toBe(400);
	});

	it("attaches the caller's own logo and returns a signed url", async () => {
		const vendorUser = await createVendorUser("a");
		const logo = await createOwnedFile(vendorUser.id, "uploads/a/logo.png");

		const res = await post("vendor/upsertMine", "user_vendor_a", {
			...baseProfile,
			logoFileUuid: logo.uuid,
		}).expect(200);

		expect(rpcBody(res).logoUrl).toBe(
			"https://signed.example/uploads/a/logo.png",
		);
		expect(rpcBody(res).logoFileUuid).toBe(logo.uuid);
	});

	it("attaches portfolio images in order with signed urls", async () => {
		const vendorUser = await createVendorUser("a");
		const first = await createOwnedFile(vendorUser.id, "uploads/a/img1.png");
		const second = await createOwnedFile(vendorUser.id, "uploads/a/img2.png");

		const res = await post("vendor/upsertMine", "user_vendor_a", {
			...baseProfile,
			imageFileUuids: [first.uuid, second.uuid],
		}).expect(200);

		const images = rpcBody(res).images;
		expect(images).toHaveLength(2);
		expect(images[0]).toMatchObject({
			fileUuid: first.uuid,
			url: "https://signed.example/uploads/a/img1.png",
			sortOrder: 0,
		});
		expect(images[1]).toMatchObject({
			fileUuid: second.uuid,
			url: "https://signed.example/uploads/a/img2.png",
			sortOrder: 1,
		});
	});
});

describe("vendor.publish", () => {
	it("returns 404 when the caller has no profile", async () => {
		await createVendorUser("a");
		const res = await post("vendor/publish", "user_vendor_a", {
			publish: true,
		});
		expect(res.status).toBe(404);
	});

	it("returns 400 when publishing a profile with no packages", async () => {
		await createVendorUser("a");
		await post("vendor/upsertMine", "user_vendor_a", {
			...baseProfile,
			packages: [],
		}).expect(200);

		const res = await post("vendor/publish", "user_vendor_a", {
			publish: true,
		});
		expect(res.status).toBe(400);
	});

	it("publishes a complete profile", async () => {
		await createVendorUser("a");
		await post("vendor/upsertMine", "user_vendor_a", baseProfile).expect(200);

		const res = await post("vendor/publish", "user_vendor_a", {
			publish: true,
		}).expect(200);
		expect(rpcBody(res).isPublished).toBe(true);
	});
});

describe("vendor.getMine", () => {
	it("returns a null logo url when the logo file was deleted", async () => {
		const vendorUser = await createVendorUser("a");
		const logo = await createOwnedFile(vendorUser.id, "uploads/a/logo.png");
		await post("vendor/upsertMine", "user_vendor_a", {
			...baseProfile,
			logoFileUuid: logo.uuid,
		}).expect(200);

		await db
			.update(files)
			.set({ deletedAt: new Date() })
			.where(eq(files.uuid, logo.uuid));

		const res = await post("vendor/getMine", "user_vendor_a").expect(200);
		expect(rpcBody(res).logoUrl).toBeNull();
	});

	it("returns null when the vendor has no profile", async () => {
		await createVendorUser("a");
		const res = await post("vendor/getMine", "user_vendor_a").expect(200);
		expect(rpcBody(res)).toBeNull();
	});

	it("returns the caller's own draft profile", async () => {
		await createVendorUser("a");
		await post("vendor/upsertMine", "user_vendor_a", baseProfile).expect(200);

		const res = await post("vendor/getMine", "user_vendor_a").expect(200);
		expect(rpcBody(res).businessName).toBe("Evergreen Studio");
	});
});

describe("vendor.list", () => {
	async function seedPublished(suffix: string, category = "photography") {
		await createVendorUser(suffix);
		await post("vendor/upsertMine", `user_vendor_${suffix}`, {
			...baseProfile,
			category,
		}).expect(200);
		await post("vendor/publish", `user_vendor_${suffix}`, {
			publish: true,
		}).expect(200);
	}

	it("returns only published vendors", async () => {
		await seedPublished("a");
		await createVendorUser("b");
		await post("vendor/upsertMine", "user_vendor_b", baseProfile).expect(200); // draft

		const res = await post("vendor/list", "user_vendor_a", {}).expect(200);
		expect(rpcBody(res).items).toHaveLength(1);
	});

	it("filters by category", async () => {
		await seedPublished("a", "photography");
		await seedPublished("b", "floral");

		const res = await post("vendor/list", "user_vendor_a", {
			category: "floral",
		}).expect(200);
		const items = rpcBody(res).items;
		expect(items).toHaveLength(1);
		expect(items[0].category).toBe("floral");
	});

	it("paginates with a cursor", async () => {
		await seedPublished("a");
		await seedPublished("b");
		await seedPublished("c");

		const first = await post("vendor/list", "user_vendor_a", {
			limit: 2,
		}).expect(200);
		expect(rpcBody(first).items).toHaveLength(2);
		expect(rpcBody(first).nextCursor).not.toBeNull();

		const second = await post("vendor/list", "user_vendor_a", {
			limit: 2,
			cursor: rpcBody(first).nextCursor,
		}).expect(200);
		expect(rpcBody(second).items).toHaveLength(1);
		expect(rpcBody(second).nextCursor).toBeNull();
	});

	it("returns 401 without auth", async () => {
		const res = await request(app)
			.post("/rpc/vendor/list")
			.set("Content-Type", "application/json")
			.send(JSON.stringify({ json: {} }));
		expect(res.status).toBe(401);
	});
});

describe("vendor.getByUuid", () => {
	it("returns a published vendor by uuid", async () => {
		await createVendorUser("a");
		const created = await post(
			"vendor/upsertMine",
			"user_vendor_a",
			baseProfile,
		).expect(200);
		await post("vendor/publish", "user_vendor_a", { publish: true }).expect(
			200,
		);
		const { uuid } = rpcBody(created);

		const res = await post("vendor/getByUuid", "user_vendor_a", {
			uuid,
		}).expect(200);
		expect(rpcBody(res).uuid).toBe(uuid);
	});

	it("returns 404 for an unpublished draft", async () => {
		await createVendorUser("a");
		const created = await post(
			"vendor/upsertMine",
			"user_vendor_a",
			baseProfile,
		).expect(200);
		const { uuid } = rpcBody(created);

		const res = await post("vendor/getByUuid", "user_vendor_a", { uuid });
		expect(res.status).toBe(404);
	});

	it("returns 404 for an unknown uuid", async () => {
		await createVendorUser("a");
		const res = await post("vendor/getByUuid", "user_vendor_a", {
			uuid: "00000000-0000-0000-0000-000000000000",
		});
		expect(res.status).toBe(404);
	});
});
