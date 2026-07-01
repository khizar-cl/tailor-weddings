import { relations } from "drizzle-orm";
import {
	index,
	integer,
	pgTable,
	serial,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { files } from "./files.schema";
import { users } from "./users.schema";
import { vendors } from "./vendors.schema";

export const vendorImages = pgTable(
	"vendor_images",
	{
		id: serial("id").primaryKey(),
		uuid: uuid("uuid").notNull().unique().defaultRandom(),
		vendorId: integer("vendor_id")
			.notNull()
			.references(() => vendors.id, { onDelete: "cascade" }),
		fileId: integer("file_id")
			.notNull()
			.references(() => files.id, { onDelete: "cascade" }),
		sortOrder: integer("sort_order").notNull().default(0),
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
	},
	(table) => [
		index("vendor_images_vendor_id_idx").on(table.vendorId),
		index("vendor_images_file_id_idx").on(table.fileId),
	],
);

export const vendorImagesRelations = relations(vendorImages, ({ one }) => ({
	vendor: one(vendors, {
		fields: [vendorImages.vendorId],
		references: [vendors.id],
	}),
	file: one(files, {
		fields: [vendorImages.fileId],
		references: [files.id],
	}),
}));
