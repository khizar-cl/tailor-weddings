"use client";

import { Badge } from "@repo/ui/components/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { ImageIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useVendorDetail } from "../../../../api/vendor.api";
import { BaseLayout } from "../../../../components/base-layout";
import {
	formatPriceCents,
	VENDOR_CATEGORY_LABELS,
} from "../../../../components/vendor/vendor-format";
import { useSetBreadcrumbLabel } from "../../../../providers/breadcrumb-provider";

export default function VendorDetailPage() {
	const params = useParams<{ uuid: string }>();
	const { data: vendor, isLoading, error } = useVendorDetail(params.uuid);

	useSetBreadcrumbLabel(vendor?.businessName);

	if (isLoading) {
		return (
			<BaseLayout title={<Skeleton className="h-6 w-48" />}>
				<Skeleton className="h-64 rounded-md" />
			</BaseLayout>
		);
	}

	if (error || !vendor) {
		return (
			<BaseLayout title="Vendor not found">
				<p className="text-destructive text-sm">
					{error?.message ?? "This vendor profile is unavailable."}
				</p>
			</BaseLayout>
		);
	}

	return (
		<BaseLayout
			title={vendor.businessName}
			description={vendor.tagline ?? undefined}
		>
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<div className="flex size-20 items-center justify-center overflow-hidden rounded-md border bg-muted">
						{vendor.logoUrl ? (
							// biome-ignore lint/performance/noImgElement: presigned S3 urls aren't wired for next/image
							<img
								src={vendor.logoUrl}
								alt={vendor.businessName}
								className="size-full object-cover"
							/>
						) : (
							<ImageIcon className="size-8 text-muted-foreground" />
						)}
					</div>
					<Badge tone="secondary" variant="outline">
						{VENDOR_CATEGORY_LABELS[vendor.category]}
					</Badge>
					{/* Reserved for Slice 2: "Save to Team" action lives here. */}
				</div>

				{vendor.description && (
					<Card>
						<CardHeader>
							<CardTitle>About</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="whitespace-pre-line text-muted-foreground text-sm">
								{vendor.description}
							</p>
						</CardContent>
					</Card>
				)}

				{vendor.images.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle>Portfolio</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
								{vendor.images.map((image) => (
									<div
										key={image.uuid}
										className="aspect-square overflow-hidden rounded-md border bg-muted"
									>
										{/* biome-ignore lint/performance/noImgElement: presigned S3 urls aren't wired for next/image */}
										<img
											src={image.url}
											alt={`${vendor.businessName} portfolio`}
											className="size-full object-cover"
										/>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				)}

				<Card>
					<CardHeader>
						<CardTitle>Packages</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{vendor.packages.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								No packages listed yet.
							</p>
						) : (
							vendor.packages.map((pkg) => (
								<div
									key={pkg.uuid}
									className="flex items-start justify-between gap-4 rounded-md border p-4"
								>
									<div className="space-y-1">
										<p className="font-medium text-foreground text-sm">
											{pkg.name}
										</p>
										{pkg.description && (
											<p className="text-muted-foreground text-sm">
												{pkg.description}
											</p>
										)}
									</div>
									<p className="whitespace-nowrap font-semibold text-foreground text-sm">
										{formatPriceCents(pkg.priceCents)}
									</p>
								</div>
							))
						)}
					</CardContent>
				</Card>

				{/* Reserved for Slice 2: reviews section renders below packages. */}
			</div>
		</BaseLayout>
	);
}
