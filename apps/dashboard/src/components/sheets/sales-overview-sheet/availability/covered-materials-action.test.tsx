/** @jsxImportSource react */
import { expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

let summary: { eligibleReviewCount: number; pendingReviewCount?: number; canApply: boolean; workerMode: boolean; revision: string; canSynchronize?: boolean; repairableAllocationCount?: number; repairableClassificationCount?: number; blockedReviewCount?: number; blockers?: string[] } = { eligibleReviewCount: 1, canApply: true, workerMode: false, revision: "revision" };
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
	summary = { eligibleReviewCount: 1, canApply: false, canSynchronize: false, workerMode: true, revision: "revision" };
	const html = renderToStaticMarkup(<CoveredMaterialsAction salesOrderId={1} />);
	expect(html).toContain("for your assignments");
	expect(html).toContain("Contact your supervisor");
	expect(html).not.toContain(">Sync<");
});
test("repair candidates expose Sync even before submitted work becomes eligible", () => {
	summary = { eligibleReviewCount: 0, canApply: true, canSynchronize: true, workerMode: false, revision: "revision", repairableAllocationCount: 3, repairableClassificationCount: 2 };
	const html = renderToStaticMarkup(<CoveredMaterialsAction salesOrderId={1} />);
	expect(html).toContain(">Sync<");
	expect(html).toContain("repair stale material suggestions");
	expect(html).not.toContain("Contact your supervisor");
});
test("unrepairable evidence names the blocker and keeps an inventory action", () => {
	summary = { eligibleReviewCount: 0, canApply: false, canSynchronize: true, workerMode: false, revision: "revision", blockers: ["2-0 door: insufficient received stock."] };
	const html = renderToStaticMarkup(<CoveredMaterialsAction salesOrderId={1} onOpenInventory={() => {}} />);
	expect(html).toContain("2-0 door: insufficient received stock.");
	expect(html).toContain("Open inventory");
	expect(html).not.toContain("Received materials need to be synced");
	expect(html).not.toContain("Contact your supervisor");
});
test("no eligible reviews hides only the covered-material action", () => {
	summary = { eligibleReviewCount: 0, canApply: false, workerMode: false, revision: "revision" };
	expect(renderToStaticMarkup(<CoveredMaterialsAction salesOrderId={1} />)).toBe("");
});

test("review-only pending work keeps a top notice and one Sync action", () => {
 summary = { eligibleReviewCount: 1, pendingReviewCount: 1, canApply: true, canSynchronize: true, workerMode: false, revision: "revision" };
 const html = renderToStaticMarkup(<CoveredMaterialsAction salesOrderId={1} />);
 expect(html).toContain("Materials are ready — submitted work needs approval");
 expect(html).toContain("recheck the pending reviews");
 expect(html.match(/>Sync</g)).toHaveLength(1);
});
