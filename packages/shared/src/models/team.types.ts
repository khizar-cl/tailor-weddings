import { z } from "zod";
import { VendorListItemSchema } from "./vendor.types";

// ----- Inputs -----

export const SaveVendorInputSchema = z.object({
	vendorUuid: z.string().uuid(),
});

export type SaveVendorInputSchema = z.infer<typeof SaveVendorInputSchema>;

// ----- Outputs -----

export const TeamMemberSchema = z.object({
	savedAt: z.date(),
	note: z.string().nullable(),
	vendor: VendorListItemSchema,
});

export type TeamMemberSchema = z.infer<typeof TeamMemberSchema>;

export const TeamListSchema = z.object({
	items: z.array(TeamMemberSchema),
});

export type TeamListSchema = z.infer<typeof TeamListSchema>;

export const UnsaveVendorResultSchema = z.object({
	removed: z.boolean(),
});

export type UnsaveVendorResultSchema = z.infer<typeof UnsaveVendorResultSchema>;
