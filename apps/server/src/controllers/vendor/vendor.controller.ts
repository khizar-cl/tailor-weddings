import { Roles } from "@repo/shared";
import { requireRole } from "../../orpc/middleware";
import { protectedProcedure } from "../../orpc/procedures";
import {
	getByUuid,
	getMine,
	list,
	publish,
	upsertMine,
} from "./vendor.service";

const vendorProcedure = protectedProcedure.use(requireRole(Roles.VENDOR));

export const vendorController = {
	upsertMine: vendorProcedure.vendor.upsertMine.handler(
		async ({ context, input }) => upsertMine(context.dbUser, input),
	),

	getMine: vendorProcedure.vendor.getMine.handler(async ({ context }) =>
		getMine(context.dbUser),
	),

	publish: vendorProcedure.vendor.publish.handler(async ({ context, input }) =>
		publish(context.dbUser, input),
	),

	list: protectedProcedure.vendor.list.handler(async ({ input }) =>
		list(input),
	),

	getByUuid: protectedProcedure.vendor.getByUuid.handler(async ({ input }) =>
		getByUuid(input),
	),
};
