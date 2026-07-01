import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	pgEnum,
	pgTable,
	serial,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { files } from "./files.schema";
import { servicePackages } from "./service-packages.schema";
import { users } from "./users.schema";
import { vendorImages } from "./vendor-images.schema";

// pgEnum requires literal types for proper Drizzle column type inference. The
// values here MUST stay aligned with VendorCategoryEnum in
// packages/shared/src/models/vendor.types.ts — a paired source-of-truth
// declaration (DB schema + runtime validation).
export const vendorCategoryEnum = pgEnum("vendor_category", [
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

export const vendors = pgTable(
	"vendors",
	{
		id: serial("id").primaryKey(),
		uuid: uuid("uuid").notNull().unique().defaultRandom(),
		userId: integer("user_id")
			.notNull()
			.unique()
			.references(() => users.id, { onDelete: "cascade" }),
		businessName: text("business_name").notNull(),
		category: vendorCategoryEnum("category").notNull(),
		tagline: text("tagline"),
		description: text("description"),
		logoFileId: integer("logo_file_id").references(() => files.id, {
			onDelete: "set null",
		}),
		isPublished: boolean("is_published").notNull().default(false),
		createdBy: integer("created_by")
			.notNull()
			.references(() => users.id),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedBy: integer("updated_by")
			.notNull()
			.references(() => users.id),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => [
		index("vendors_category_is_published_idx").on(
			table.category,
			table.isPublished,
		),
	],
);

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
	user: one(users, {
		fields: [vendors.userId],
		references: [users.id],
	}),
	logoFile: one(files, {
		fields: [vendors.logoFileId],
		references: [files.id],
	}),
	images: many(vendorImages),
	packages: many(servicePackages),
}));
