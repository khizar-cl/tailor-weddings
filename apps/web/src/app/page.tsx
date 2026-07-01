"use client";

import { useAuth } from "@clerk/nextjs";
import { buttonVariants } from "@repo/ui/components/button";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@repo/ui/lib/utils";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoInline } from "../components/logo";

export default function LandingPage() {
	const { isSignedIn, isLoaded } = useAuth();

	if (isLoaded && isSignedIn) {
		redirect("/portal");
	}

	if (!isLoaded) {
		return (
			<div className="flex h-screen items-center justify-center bg-background">
				<Spinner className="size-8" />
			</div>
		);
	}

	return (
		<div className="flex min-h-screen flex-col bg-background">
			<header className="flex h-16 items-center border-border border-b bg-card/60 px-6 backdrop-blur-md">
				<LogoInline size="sm" priority />
			</header>
			<main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
				<h1 className="font-semibold text-3xl text-foreground tracking-tight sm:text-4xl">
					Tailor Weddings
				</h1>
				<p className="mt-3 max-w-md text-muted-foreground">
					The wedding marketplace that connects couples with trusted vendors.
				</p>
				<Link
					data-testid="cta-get-started"
					href={{ pathname: "/sign-in/" }}
					className={cn(buttonVariants({ size: "lg" }), "mt-8")}
				>
					Get started
					<ArrowRightIcon className="h-4 w-4" />
				</Link>
			</main>
		</div>
	);
}
