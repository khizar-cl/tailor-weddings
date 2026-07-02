import type {
	FileRecord,
	VendorCategory,
	VendorDetailSchema,
	VendorListInputSchema,
} from "@repo/shared";
import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "../utils/orpc";

export function useMyVendorProfile() {
	return useQuery(orpc.vendor.getMine.queryOptions());
}

export function useVendorList(input: VendorListInputSchema) {
	return useQuery(orpc.vendor.list.queryOptions({ input }));
}

export function useVendorDirectory(category?: VendorCategory) {
	return useInfiniteQuery(
		orpc.vendor.list.infiniteOptions({
			input: (cursor: string | undefined) => ({ category, cursor, limit: 20 }),
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
		}),
	);
}

export function useVendorDetail(uuid: string | undefined) {
	return useQuery(
		orpc.vendor.getByUuid.queryOptions({
			input: { uuid: uuid ?? "" },
			enabled: Boolean(uuid),
		}),
	);
}

export function useUpsertVendorProfile({
	onSuccess,
}: {
	onSuccess?: (data: VendorDetailSchema) => void;
} = {}) {
	const queryClient = useQueryClient();
	return useMutation(
		orpc.vendor.upsertMine.mutationOptions({
			onSuccess: (data) => {
				queryClient.invalidateQueries({ queryKey: orpc.vendor.key() });
				toast.success("Profile saved");
				onSuccess?.(data);
			},
		}),
	);
}

export function usePublishVendorProfile({
	onSuccess,
}: {
	onSuccess?: (data: VendorDetailSchema) => void;
} = {}) {
	const queryClient = useQueryClient();
	return useMutation(
		orpc.vendor.publish.mutationOptions({
			onSuccess: (data) => {
				queryClient.invalidateQueries({ queryKey: orpc.vendor.key() });
				toast.success(
					data.isPublished ? "Profile published" : "Profile unpublished",
				);
				onSuccess?.(data);
			},
		}),
	);
}

export function useUploadFile({
	onSuccess,
}: {
	onSuccess?: (data: FileRecord) => void;
} = {}) {
	return useMutation(
		orpc.storage.uploadFile.mutationOptions({
			onSuccess: (data) => {
				onSuccess?.(data);
			},
		}),
	);
}
