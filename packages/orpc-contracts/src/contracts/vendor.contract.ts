import { oc } from "@orpc/contract";
import {
	PublishVendorInputSchema,
	UpsertVendorInputSchema,
	VendorByUuidInputSchema,
	VendorDetailSchema,
	VendorListInputSchema,
	VendorListPageSchema,
} from "@repo/shared";

export const vendorContract = {
	upsertMine: oc.input(UpsertVendorInputSchema).output(VendorDetailSchema),
	getMine: oc.output(VendorDetailSchema.nullable()),
	publish: oc.input(PublishVendorInputSchema).output(VendorDetailSchema),
	list: oc.input(VendorListInputSchema).output(VendorListPageSchema),
	getByUuid: oc.input(VendorByUuidInputSchema).output(VendorDetailSchema),
};
