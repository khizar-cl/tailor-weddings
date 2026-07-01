import { HomeIcon, UserIcon } from "lucide-react";
import type { NavigationItem } from "../components/app-sidebar";

export const navigationItems: NavigationItem[] = [
	{
		title: "Home",
		url: "/portal",
		icon: HomeIcon,
	},
	{
		title: "Profile",
		url: "/portal/profile",
		icon: UserIcon,
	},
];
