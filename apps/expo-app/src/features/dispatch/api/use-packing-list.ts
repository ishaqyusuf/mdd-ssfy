import { _trpc } from "@/components/static-trpc";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { PackingListTab } from "../types/dispatch.types";

type Props = {
	tab: PackingListTab;
};

export function usePackingList({ tab }: Props) {
	const query = useQuery(_trpc.dispatch.packingList.queryOptions({ tab }));

	const items = useMemo(() => query.data ?? [], [query.data]);

	return {
		...query,
		items,
	};
}
