type QueryClientLike = {
	invalidateQueries: (input: {
		queryKey: readonly unknown[];
	}) => Promise<unknown>;
};

type PathKeyProcedureLike = {
	pathKey: () => readonly unknown[];
};

type InboundStatusTRPCLike = {
	sales: {
		getOrders: PathKeyProcedureLike;
		getSaleOverview: PathKeyProcedureLike;
		inboundSummary: PathKeyProcedureLike;
		inboundIndex: PathKeyProcedureLike;
	};
	inventories: {
		salesInventoryOverview: PathKeyProcedureLike;
		inboundDemandQueue: PathKeyProcedureLike;
		inboundStatusDemandReconciliation: PathKeyProcedureLike;
	};
	notes: {
		activityTree: PathKeyProcedureLike;
	};
};

export function invalidateInboundStatusQueries(
	queryClient: QueryClientLike,
	trpc: InboundStatusTRPCLike,
) {
	const queryKeys = [
		trpc.sales.getOrders.pathKey(),
		trpc.sales.getSaleOverview.pathKey(),
		trpc.sales.inboundSummary.pathKey(),
		trpc.sales.inboundIndex.pathKey(),
		trpc.inventories.salesInventoryOverview.pathKey(),
		trpc.inventories.inboundDemandQueue.pathKey(),
		trpc.inventories.inboundStatusDemandReconciliation.pathKey(),
		trpc.notes.activityTree.pathKey(),
	];

	for (const queryKey of queryKeys) {
		void queryClient.invalidateQueries({ queryKey });
	}
}
