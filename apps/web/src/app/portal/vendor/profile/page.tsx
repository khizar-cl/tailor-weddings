"use client";

import {
	UpsertVendorInputSchema,
	type VendorCategory,
	VendorCategoryEnum,
	type VendorDetailSchema,
} from "@repo/shared";
import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { Spinner } from "@repo/ui/components/spinner";
import { Textarea } from "@repo/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { ImageIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
	useMyVendorProfile,
	usePublishVendorProfile,
	useUploadFile,
	useUpsertVendorProfile,
} from "../../../../api/vendor.api";
import { BaseLayout } from "../../../../components/base-layout";

const CATEGORY_LABELS: Record<VendorCategory, string> = {
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

function centsToDollars(cents: number): string {
	return cents ? (cents / 100).toString() : "";
}

function dollarsToCents(value: string): number {
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) : 0;
}

function toFormValues(profile: VendorDetailSchema): UpsertVendorInputSchema {
	return {
		businessName: profile.businessName,
		category: profile.category,
		tagline: profile.tagline ?? "",
		description: profile.description ?? "",
		logoFileUuid: profile.logoFileUuid,
		imageFileUuids: profile.images.map((image) => image.fileUuid),
		packages: profile.packages.map((pkg) => ({
			name: pkg.name,
			description: pkg.description ?? "",
			priceCents: pkg.priceCents,
			sortOrder: pkg.sortOrder,
		})),
	};
}

const emptyValues: UpsertVendorInputSchema = {
	businessName: "",
	category: "photography",
	tagline: "",
	description: "",
	logoFileUuid: null,
	imageFileUuids: [],
	packages: [],
};

export default function VendorProfilePage() {
	const { data: profile, isLoading } = useMyVendorProfile();
	const upsert = useUpsertVendorProfile();
	const publish = usePublishVendorProfile();
	const upload = useUploadFile();

	// fileUuid -> displayable url (existing presigned urls + local previews for new uploads)
	const [previews, setPreviews] = useState<Record<string, string>>({});
	const seeded = useRef(false);

	const form = useForm({
		defaultValues: emptyValues,
		validators: { onChange: UpsertVendorInputSchema },
		onSubmit: ({ value }) => {
			upsert.mutate({
				...value,
				packages: value.packages.map((pkg, index) => ({
					...pkg,
					sortOrder: index,
				})),
			});
		},
	});

	useEffect(() => {
		if (!profile || seeded.current) {
			return;
		}
		form.reset(toFormValues(profile));
		const seededPreviews: Record<string, string> = {};
		if (profile.logoFileUuid && profile.logoUrl) {
			seededPreviews[profile.logoFileUuid] = profile.logoUrl;
		}
		for (const image of profile.images) {
			seededPreviews[image.fileUuid] = image.url;
		}
		setPreviews(seededPreviews);
		seeded.current = true;
	}, [profile, form]);

	async function uploadAndPreview(file: File): Promise<string> {
		const record = await upload.mutateAsync({ file });
		setPreviews((current) => ({
			...current,
			[record.uuid]: URL.createObjectURL(file),
		}));
		return record.uuid;
	}

	async function handleLogoChange(fileList: FileList | null) {
		const file = fileList?.[0];
		if (!file) {
			return;
		}
		const uuid = await uploadAndPreview(file);
		form.setFieldValue("logoFileUuid", uuid);
	}

	async function handleImagesChange(fileList: FileList | null) {
		for (const file of Array.from(fileList ?? [])) {
			const uuid = await uploadAndPreview(file);
			form.setFieldValue("imageFileUuids", (current) => [...current, uuid]);
		}
	}

	if (isLoading) {
		return (
			<BaseLayout title="My Profile" description="Manage your vendor profile.">
				<div className="flex items-center justify-center py-12">
					<Spinner className="size-8" />
				</div>
			</BaseLayout>
		);
	}

	const isPublished = profile?.isPublished ?? false;

	return (
		<BaseLayout
			title="My Profile"
			description="Manage the profile couples see in the directory."
		>
			<form
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-6"
			>
				<Card>
					<CardHeader>
						<CardTitle>Business details</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<form.Field
							name="businessName"
							children={(field) => (
								<div className="space-y-2">
									<Label htmlFor="businessName">Business name</Label>
									<Input
										id="businessName"
										value={field.state.value}
										onChange={(event) => field.handleChange(event.target.value)}
										onBlur={field.handleBlur}
										aria-invalid={
											field.state.meta.isTouched &&
											field.state.meta.errors.length > 0
										}
									/>
									{field.state.meta.isTouched &&
										field.state.meta.errors.length > 0 && (
											<p className="invalid-input">
												{field.state.meta.errors[0]?.message}
											</p>
										)}
								</div>
							)}
						/>

						<form.Field
							name="category"
							children={(field) => (
								<div className="space-y-2">
									<Label htmlFor="category">Category</Label>
									<Select
										value={field.state.value}
										onValueChange={(value) =>
											field.handleChange(value as VendorCategory)
										}
									>
										<SelectTrigger id="category">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{VendorCategoryEnum.options.map((category) => (
												<SelectItem key={category} value={category}>
													{CATEGORY_LABELS[category]}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
						/>

						<form.Field
							name="tagline"
							children={(field) => (
								<div className="space-y-2">
									<Label htmlFor="tagline">
										Tagline{" "}
										<span className="text-muted-foreground">(optional)</span>
									</Label>
									<Input
										id="tagline"
										value={field.state.value ?? ""}
										onChange={(event) => field.handleChange(event.target.value)}
										onBlur={field.handleBlur}
										maxLength={160}
									/>
								</div>
							)}
						/>

						<form.Field
							name="description"
							children={(field) => (
								<div className="space-y-2">
									<Label htmlFor="description">
										Description{" "}
										<span className="text-muted-foreground">(optional)</span>
									</Label>
									<Textarea
										id="description"
										rows={4}
										value={field.state.value ?? ""}
										onChange={(event) => field.handleChange(event.target.value)}
										onBlur={field.handleBlur}
										maxLength={5000}
									/>
								</div>
							)}
						/>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Logo & portfolio</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<form.Field
							name="logoFileUuid"
							children={(field) => (
								<div className="space-y-2">
									<Label htmlFor="logo">Logo</Label>
									<div className="flex items-center gap-4">
										<div className="flex size-16 items-center justify-center overflow-hidden rounded-md border bg-muted">
											{field.state.value && previews[field.state.value] ? (
												// biome-ignore lint/performance/noImgElement: previews include blob: urls not supported by next/image
												<img
													src={previews[field.state.value]}
													alt="Logo preview"
													className="size-full object-cover"
												/>
											) : (
												<ImageIcon className="size-6 text-muted-foreground" />
											)}
										</div>
										<Input
											id="logo"
											type="file"
											accept="image/*"
											className="max-w-xs"
											onChange={(event) => handleLogoChange(event.target.files)}
										/>
									</div>
								</div>
							)}
						/>

						<form.Field
							name="imageFileUuids"
							mode="array"
							children={(field) => (
								<div className="space-y-2">
									<Label htmlFor="portfolio">Portfolio images</Label>
									<Input
										id="portfolio"
										type="file"
										accept="image/*"
										multiple
										className="max-w-xs"
										onChange={(event) => handleImagesChange(event.target.files)}
									/>
									<div className="flex flex-wrap gap-3 pt-2">
										{field.state.value.map((fileUuid, index) => (
											<div
												key={fileUuid}
												className="relative size-20 overflow-hidden rounded-md border bg-muted"
											>
												{previews[fileUuid] && (
													// biome-ignore lint/performance/noImgElement: previews include blob: urls not supported by next/image
													<img
														src={previews[fileUuid]}
														alt="Portfolio preview"
														className="size-full object-cover"
													/>
												)}
												<Button
													type="button"
													tone="destructive"
													variant="solid"
													size="icon-xs"
													className="absolute top-1 right-1"
													onClick={() => field.removeValue(index)}
												>
													<Trash2Icon />
												</Button>
											</div>
										))}
									</div>
								</div>
							)}
						/>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Service packages</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<form.Field
							name="packages"
							mode="array"
							children={(field) => (
								<div className="space-y-4">
									{field.state.value.map((pkg, index) => (
										<div
											key={`${index}-${pkg.sortOrder}`}
											className="space-y-3 rounded-md border p-4"
										>
											<div className="form-row">
												<form.Field
													name={`packages[${index}].name`}
													children={(sub) => (
														<div className="form-container flex-1">
															<Label>Package name</Label>
															<Input
																value={sub.state.value}
																onChange={(event) =>
																	sub.handleChange(event.target.value)
																}
																onBlur={sub.handleBlur}
																aria-invalid={
																	sub.state.meta.isTouched &&
																	sub.state.meta.errors.length > 0
																}
															/>
															{sub.state.meta.isTouched &&
																sub.state.meta.errors.length > 0 && (
																	<p className="invalid-input">
																		{sub.state.meta.errors[0]?.message}
																	</p>
																)}
														</div>
													)}
												/>
												<form.Field
													name={`packages[${index}].priceCents`}
													children={(sub) => (
														<div className="form-container flex-1">
															<Label>Price (USD)</Label>
															<Input
																type="number"
																min={0}
																step="0.01"
																value={centsToDollars(sub.state.value)}
																onChange={(event) =>
																	sub.handleChange(
																		dollarsToCents(event.target.value),
																	)
																}
																onBlur={sub.handleBlur}
															/>
														</div>
													)}
												/>
											</div>
											<form.Field
												name={`packages[${index}].description`}
												children={(sub) => (
													<div className="form-container">
														<Label>
															Description{" "}
															<span className="text-muted-foreground">
																(optional)
															</span>
														</Label>
														<Textarea
															rows={2}
															value={sub.state.value ?? ""}
															onChange={(event) =>
																sub.handleChange(event.target.value)
															}
															onBlur={sub.handleBlur}
															maxLength={2000}
														/>
													</div>
												)}
											/>
											<div className="flex justify-end">
												<Button
													type="button"
													tone="destructive"
													variant="outline"
													size="sm"
													onClick={() => field.removeValue(index)}
												>
													<Trash2Icon />
													Remove
												</Button>
											</div>
										</div>
									))}
									<Button
										type="button"
										tone="secondary"
										variant="outline"
										onClick={() =>
											field.pushValue({
												name: "",
												description: "",
												priceCents: 0,
												sortOrder: field.state.value.length,
											})
										}
									>
										<PlusIcon />
										Add package
									</Button>
								</div>
							)}
						/>
					</CardContent>
				</Card>

				<div className="form-actions">
					<Button
						type="button"
						tone="secondary"
						variant="outline"
						disabled={!profile || publish.isPending || upsert.isPending}
						onClick={() => publish.mutate({ publish: !isPublished })}
					>
						{isPublished ? "Unpublish" : "Publish"}
					</Button>
					<Button
						type="submit"
						disabled={
							upload.isPending || upsert.isPending || !form.state.canSubmit
						}
					>
						{upsert.isPending ? "Saving..." : "Save profile"}
					</Button>
				</div>
			</form>
		</BaseLayout>
	);
}
