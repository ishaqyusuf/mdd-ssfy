import { getContractorOverviewAction } from "./_actions/get-contractor-overview";

export type ContractorOverview = Awaited<
    ReturnType<typeof getContractorOverviewAction>
>;
