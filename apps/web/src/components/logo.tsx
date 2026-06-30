import { cn } from "@repo/ui/lib/utils";
import Image from "next/image";
import logoLockup from "../assets/images/logo_lockup.png";
import logoMark from "../assets/images/logo_mark.png";

interface LogoProps {
	className?: string;
	priority?: boolean;
}

/**
 * The brand artwork is dark evergreen on transparent, which vanishes on the
 * near-black dark-theme surfaces — so it's rendered as a light monochrome there.
 */
const darkModeContrast = "dark:brightness-0 dark:invert";

/** Needle-and-rings brand mark, no wordmark. */
export function LogoMark({ className, priority }: LogoProps) {
	return (
		<Image
			src={logoMark}
			alt="Tailor Weddings"
			priority={priority}
			className={cn("object-contain", darkModeContrast, className)}
		/>
	);
}

/** Brand mark stacked above the "Tailor Weddings" wordmark. */
export function LogoLockup({ className, priority }: LogoProps) {
	return (
		<Image
			src={logoLockup}
			alt="Tailor Weddings"
			priority={priority}
			className={cn("object-contain", darkModeContrast, className)}
		/>
	);
}

/**
 * Horizontal lockup: brand mark beside the wordmark in the display serif.
 * Suits header bars where the stacked lockup is too tall. `size="sm"` keeps the
 * wordmark from overflowing the narrow (240px) sidebar.
 */
export function LogoInline({
	className,
	size = "md",
	priority,
}: {
	className?: string;
	size?: "sm" | "md";
	priority?: boolean;
}) {
	const small = size === "sm";
	return (
		<span
			className={cn(
				"flex min-w-0 items-center",
				small ? "gap-2" : "gap-2.5",
				className,
			)}
		>
			<LogoMark
				priority={priority}
				className={cn("w-auto shrink-0", small ? "h-8" : "h-11")}
			/>
			<span
				className={cn(
					"display-title truncate font-semibold text-foreground tracking-tight",
					small ? "text-base" : "text-2xl",
				)}
			>
				Tailor Weddings
			</span>
		</span>
	);
}
