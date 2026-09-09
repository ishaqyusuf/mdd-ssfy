/** @jsxImportSource react */
import { expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

let summary = { eligibleReviewCount: 1, canApply: true, workerMode: false, revision: "revision" };
let writes = 0;
mock.module("@/trpc/client", () => ({ useTRPC: () => ({ sales: {
	coveredProductionMaterials: { queryOptions: () => ({}), queryKey: () => [] },
	productionAvailability: { queryKey: () => [] },
	applyCoveredProductionMaterials: { mutationOptions: (options: unknown) => options },
} }) }));
mock.module("@gnd/ui/tanstack", () => ({
	useQuery: () => ({ data: summary, isLoading: false, isError: false, isFetching: false }),
	useMutation: () => ({ isPending: false, error: null, mutate: () => { writes++; } }),
	useQueryClient: () => ({ invalidateQueries: async () => undefined }),
}));
const { CoveredMaterialsAction } = await import("./covered-materials-action");

test("covered reviews expose an explicit action without writing on render", () => {
	summary = { eligibleReviewCount: 2, canApply: true, workerMode: false, revision: "revision" };
	const html = renderToStaticMarkup(<CoveredMaterialsAction salesOrderId={1} />);
	expect(html).toContain(">Sync<");
	expect(html).toContain("approve eligible submitted work in one step");
	expect(html).not.toContain("need review");
	expect(writes).toBe(0);
});
test("read-only workers see scoped guidance without a reconciliation button", () => {
	summary = { eligibleReviewCount: 1, canApply: false, workerMode: true, revision: "revision" };
	const html = renderToStaticMarkup(<CoveredMaterialsAction salesOrderId={1} />);
	expect(html).toContain("for your assignments");
	expect(html).toContain("Contact your supervisor");
	expect(html).not.toContain(">Sync<");
});
test("no eligible reviews hides only the covered-material action", () => {
	summary = { eligibleReviewCount: 0, canApply: false, workerMode: false, revision: "revision" };
	expect(renderToStaticMarkup(<CoveredMaterialsAction salesOrderId={1} />)).toBe("");
});
