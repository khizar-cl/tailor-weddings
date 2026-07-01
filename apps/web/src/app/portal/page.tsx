"use client";

import { useUser } from "@clerk/nextjs";
import { BaseLayout } from "../../components/base-layout";

export default function PortalDashboard() {
	const { user } = useUser();

	return (
		<BaseLayout
			showBreadcrumb={false}
			title={
				user ? (
					<>
						Welcome,{" "}
						<span className="mp-mask">
							{user.firstName ?? user.fullName ?? "there"}
						</span>
					</>
				) : (
					"Home"
				)
			}
			description="Your dashboard."
		>
			<div className="rounded-md border border-border border-dashed bg-card/40 p-12 text-center text-muted-foreground text-sm">
				Start building here.
			</div>
		</BaseLayout>
	);
}
