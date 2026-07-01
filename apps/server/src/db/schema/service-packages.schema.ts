import { relations } from "drizzle-orm";
import {
	index,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema";
import { vendors } from "./vendors.schema";

export const servicePackages = pgTable(
	"service_packages",
	{
		id: serial("id").primaryKey(),
		uuid: uuid("uuid").notNull().unique().defaultRandom(),
		vendorId: integer("vendor_id")
			.notNull()
			.references(() => vendors.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		description: text("description"),
		priceCents: integer("price_cents").notNull(),
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
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => [index("service_packages_vendor_id_idx").on(table.vendorId)],
);

export const servicePackagesRelations = relations(
	servicePackages,
	({ one }) => ({
		vendor: one(vendors, {
			fields: [servicePackages.vendorId],
			references: [vendors.id],
		}),
	}),
);
