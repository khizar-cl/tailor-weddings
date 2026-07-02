import { z } from "zod";

// ----- Constants -----

export const MAX_VENDOR_IMAGES = 20;
export const MAX_VENDOR_PACKAGES = 20;

// ----- Category -----

export const VendorCategoryEnum = z.enum([
	"photography",
	"videography",
	"floral",
	"catering",
	"venue",
	"planning",
	"music_dj",
	"beauty",
	"attire",
	"cake",
	"stationery",
	"rentals",
	"other",
]);

export type VendorCategory = z.infer<typeof VendorCategoryEnum>;

export const VendorCategories = {
	PHOTOGRAPHY: "photography",
	VIDEOGRAPHY: "videography",
	FLORAL: "floral",
	CATERING: "catering",
	VENUE: "venue",
	PLANNING: "planning",
	MUSIC_DJ: "music_dj",
	BEAUTY: "beauty",
	ATTIRE: "attire",
	CAKE: "cake",
	STATIONERY: "stationery",
	RENTALS: "rentals",
	OTHER: "other",
} as const satisfies Record<string, VendorCategory>;

// ----- Service packages -----

export const ServicePackageSchema = z.object({
	uuid: z.string().uuid(),
	name: z.string(),
	description: z.string().nullable(),
	priceCents: z.number().int(),
	sortOrder: z.number().int(),
});

export type ServicePackageSchema = z.infer<typeof ServicePackageSchema>;

export const ServicePackageInputSchema = z.object({
	name: z.string().min(1, "Package name is required"),
	description: z.string().max(2000).nullish(),
	priceCents: z.number().int().nonnegative(),
	sortOrder: z.number().int().nonnegative(),
});

export type ServicePackageInputSchema = z.infer<
	typeof ServicePackageInputSchema
>;

// ----- Images -----

export const VendorImageSchema = z.object({
	uuid: z.string().uuid(),
	fileUuid: z.string().uuid(),
	url: z.string(),
	sortOrder: z.number().int(),
});

export type VendorImageSchema = z.infer<typeof VendorImageSchema>;

// ----- Inputs -----

export const UpsertVendorInputSchema = z.object({
	businessName: z.string().min(1, "Business name is required").max(120),
	category: VendorCategoryEnum,
	tagline: z.string().max(160).nullish(),
	description: z.string().max(5000).nullish(),
	logoFileUuid: z.string().uuid().nullish(),
	imageFileUuids: z
		.array(z.string().uuid())
		.max(
			MAX_VENDOR_IMAGES,
			`A profile can have at most ${MAX_VENDOR_IMAGES} portfolio images`,
		),
	packages: z
		.array(ServicePackageInputSchema)
		.max(
			MAX_VENDOR_PACKAGES,
			`A profile can have at most ${MAX_VENDOR_PACKAGES} service packages`,
		),
});

export type UpsertVendorInputSchema = z.infer<typeof UpsertVendorInputSchema>;

export const PublishVendorInputSchema = z.object({
	publish: z.boolean(),
});

export type PublishVendorInputSchema = z.infer<typeof PublishVendorInputSchema>;

export const VendorListInputSchema = z.object({
	category: VendorCategoryEnum.optional(),
	cursor: z.string().optional(),
	limit: z.number().int().min(1).max(50).default(20),
});

export type VendorListInputSchema = z.infer<typeof VendorListInputSchema>;

export const VendorByUuidInputSchema = z.object({
	uuid: z.string().uuid(),
});

export type VendorByUuidInputSchema = z.infer<typeof VendorByUuidInputSchema>;

// ----- Outputs -----

export const VendorListItemSchema = z.object({
	uuid: z.string().uuid(),
	businessName: z.string(),
	category: VendorCategoryEnum,
	tagline: z.string().nullable(),
	logoUrl: z.string().nullable(),
	fromPriceCents: z.number().int().nullable(),
});

export type VendorListItemSchema = z.infer<typeof VendorListItemSchema>;

export const VendorListPageSchema = z.object({
	items: z.array(VendorListItemSchema),
	nextCursor: z.string().nullable(),
});

export type VendorListPageSchema = z.infer<typeof VendorListPageSchema>;

export const VendorDetailSchema = z.object({
	uuid: z.string().uuid(),
	businessName: z.string(),
	category: VendorCategoryEnum,
	tagline: z.string().nullable(),
	description: z.string().nullable(),
	logoFileUuid: z.string().uuid().nullable(),
	logoUrl: z.string().nullable(),
	images: z.array(VendorImageSchema),
	packages: z.array(ServicePackageSchema),
	isPublished: z.boolean(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export type VendorDetailSchema = z.infer<typeof VendorDetailSchema>;
