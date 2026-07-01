import {
	type Context,
	type Meta,
	type Middleware,
	ORPCError,
	type ORPCErrorConstructorMap,
} from "@orpc/server";
import type { UserRole } from "@repo/shared";

/**
 * Returns an oRPC middleware that allows the request through when
 * `context.dbUser.role` is in `allowedRoles`, and throws FORBIDDEN otherwise.
 *
 * Compose with `protectedProcedure.use(requireRole(Roles.ADMIN))`. It requires
 * `dbUser` on the context (added by `protectedProcedure`) and adds nothing, so
 * downstream context is preserved.
 */
export function requireRole(
	...allowedRoles: UserRole[]
): Middleware<
	Context & { dbUser: { role: UserRole } },
	Record<never, never>,
	unknown,
	unknown,
	ORPCErrorConstructorMap<Record<never, never>>,
	Meta
> {
	return ({ context, next }) => {
		if (!allowedRoles.includes(context.dbUser.role)) {
			throw new ORPCError("FORBIDDEN", {
				message: "Permission denied",
			});
		}
		return next();
	};
}
