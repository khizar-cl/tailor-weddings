import type { VendorListItemSchema } from "@repo/shared";
import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent } from "@repo/ui/components/card";
import { ImageIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { formatPriceCents, VENDOR_CATEGORY_LABELS } from "./vendor-format";

export function VendorCard({ vendor }: { vendor: VendorListItemSchema }) {
	return (
		<Link
			href={`/portal/vendors/${vendor.uuid}` as Route}
			className="block rounded-md outline-none focus-visible:ring-1 focus-visible:ring-ring"
		>
			<Card className="h-full gap-0 overflow-hidden py-0 transition-colors hover:border-primary">
				<div className="flex aspect-video items-center justify-center overflow-hidden bg-muted">
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
				<CardContent className="space-y-2 p-4">
					<h3 className="truncate font-semibold text-base text-foreground leading-tight">
						{vendor.businessName}
					</h3>
					<Badge tone="secondary" variant="outline">
						{VENDOR_CATEGORY_LABELS[vendor.category]}
					</Badge>
					{vendor.tagline && (
						<p className="line-clamp-2 text-muted-foreground text-sm">
							{vendor.tagline}
						</p>
					)}
					{vendor.fromPriceCents !== null && (
						<p className="text-foreground text-sm">
							From {formatPriceCents(vendor.fromPriceCents)}
						</p>
					)}
				</CardContent>
			</Card>
		</Link>
	);
}
