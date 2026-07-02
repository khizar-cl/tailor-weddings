import type { VendorCategory } from "@repo/shared";

export const VENDOR_CATEGORY_LABELS: Record<VendorCategory, string> = {
	photography: "Photography",
	videography: "Videography",
	floral: "Floral",
	catering: "Catering",
	venue: "Venue",
	planning: "Planning",
	music_dj: "Music & DJ",
	beauty: "Hair & Beauty",
	attire: "Attire",
	cake: "Cake & Desserts",
	stationery: "Stationery",
	rentals: "Rentals",
	other: "Other",
};

const wholeDollarFormatter = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	minimumFractionDigits: 0,
	maximumFractionDigits: 0,
});

const centsFormatter = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

export function formatPriceCents(cents: number): string {
	const formatter = cents % 100 === 0 ? wholeDollarFormatter : centsFormatter;
	return formatter.format(cents / 100);
}
