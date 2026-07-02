"use client";

import { type VendorCategory, VendorCategoryEnum } from "@repo/shared";
import { Button } from "@repo/ui/components/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Spinner } from "@repo/ui/components/spinner";
import { useState } from "react";
import { useVendorDirectory } from "../../../api/vendor.api";
import { BaseLayout } from "../../../components/base-layout";
import { VendorCard } from "../../../components/vendor/vendor-card";
import { VENDOR_CATEGORY_LABELS } from "../../../components/vendor/vendor-format";

const ALL_CATEGORIES = "all";

export default function VendorDirectoryPage() {
	const [category, setCategory] = useState<VendorCategory | undefined>();
	const {
		data,
		isLoading,
		error,
		hasNextPage,
		fetchNextPage,
		isFetchingNextPage,
	} = useVendorDirectory(category);

	const vendors = data?.pages.flatMap((page) => page.items) ?? [];

	return (
		<BaseLayout
			title="Find Vendors"
			description="Browse published wedding vendors by category."
		>
			<div className="space-y-6">
				<Select
					value={category ?? ALL_CATEGORIES}
					onValueChange={(value) =>
						setCategory(
							value === ALL_CATEGORIES ? undefined : (value as VendorCategory),
						)
					}
				>
					<SelectTrigger className="w-56">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
						{VendorCategoryEnum.options.map((option) => (
							<SelectItem key={option} value={option}>
								{VENDOR_CATEGORY_LABELS[option]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{isLoading ? (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
						{Array.from({ length: 6 }, (_, index) => (
							<Skeleton key={index} className="h-64 rounded-md" />
						))}
					</div>
				) : error ? (
					<p className="text-destructive text-sm">{error.message}</p>
				) : vendors.length === 0 ? (
					<div className="rounded-md border border-border border-dashed bg-card/40 p-12 text-center text-muted-foreground text-sm">
						No vendors published yet in this category.
					</div>
				) : (
					<>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
							{vendors.map((vendor) => (
								<VendorCard key={vendor.uuid} vendor={vendor} />
							))}
						</div>
						{hasNextPage && (
							<div className="flex justify-center">
								<Button
									tone="secondary"
									variant="outline"
									disabled={isFetchingNextPage}
									onClick={() => fetchNextPage()}
								>
									{isFetchingNextPage ? <Spinner className="size-4" /> : null}
									Load more
								</Button>
							</div>
						)}
					</>
				)}
			</div>
		</BaseLayout>
	);
}
