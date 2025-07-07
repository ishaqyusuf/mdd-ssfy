import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { getContractorOverviewAction } from "../_actions/get-contractor-overview";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import { StartCard, StatCardContainer } from "@/components/_v1/stat-card";
import UploadDocumentModal from "@/components/_v2/contractor/modals/upload-document";
import ImgModal from "@/components/_v1/modals/img-modal";
import ContractorDocuments from "../documents";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";

export default async function ContractorOverviewPage({ searchParams, params }) {
    const userId = +params.contractorId;
    const contractor = await getContractorOverviewAction(userId);

    return (
        <AuthGuard can={["editEmployee"]}>
            <div className="space-y-4 sm:px-8">
                <Breadcrumbs>
                    <BreadLink isFirst title="Contractor" />
                    <BreadLink
                        link="/contractor/contractors"
                        title="Contractors"
                    />
                    <BreadLink isLast title={contractor.user.name as any} />
                </Breadcrumbs>
                <div className="flex items-center justify-between space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">
                        {contractor.user.name}
                    </h2>
                    <div className="flex items-center space-x-2">
                        {/* <DatePicker /> */}
                        {/* <CustomerMenu customer={customer} /> */}
                    </div>
                </div>
                <div className="space-y-4">
                    <StatCardContainer>
                        <StartCard
                            href={`/contractor/jobs/payments/pay/${userId}`}
                            label="Pending Payment"
                            icon="dollar"
                            value={contractor.payable?.total}
                            money
                        />
                        <StartCard
                            label="Jobs"
                            icon="inbound"
                            value={contractor.totalJobs}
                            info={`${contractor.completedTasks} Completed.`}
                        />
                        <StartCard
                            icon="dollar"
                            value={contractor.sumPaid}
                            label="Total Paid"
                            money
                        />
                        <StartCard
                            label="Pending Jobs"
                            icon="lineChart"
                            value={contractor.pendingJobs}
                            // info={`${0 || 0} completed`}
                        />
                    </StatCardContainer>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <div className="col-span-4" />
                        <ContractorDocuments
                            className="col-span-3"
                            contractor={contractor}
                        />
                        {/* <ContractorOverviewDocs className="col-span-3" /> */}
                    </div>
                </div>
                <UploadDocumentModal />
                <ImgModal />
            </div>
        </AuthGuard>
    );
}
