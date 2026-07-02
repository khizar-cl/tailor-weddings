import { HomeIcon, SearchIcon, StoreIcon, UserIcon } from "lucide-react";
import type { NavigationItem } from "../components/app-sidebar";

export const navigationItems: NavigationItem[] = [
	{
		title: "Home",
		url: "/portal",
		icon: HomeIcon,
	},
	{
		title: "Find Vendors",
		url: "/portal/vendors",
		icon: SearchIcon,
	},
	{
		title: "My Vendor Profile",
		url: "/portal/vendor/profile",
		icon: StoreIcon,
	},
	{
		title: "Profile",
		url: "/portal/profile",
		icon: UserIcon,
	},
];
