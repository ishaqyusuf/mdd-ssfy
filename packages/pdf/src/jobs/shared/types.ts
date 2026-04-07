export type StatusSummary = {
	status: string;
	jobCount: number;
	totalAmount: number;
};

export type PrintJob = {
	id: number;
	title: string | null;
	subtitle: string | null;
	description: string | null;
	amount: number;
	status: string | null;
	createdAt: Date | string;
	jobType: string;
	isCustom?: boolean | null;
	builderTaskName: string | null;
	contractorName: string;
	projectTitle: string;
	lotBlock: string | null;
	modelName: string | null;
};

export type PayrollContractor = {
	contractorId: number | null;
	contractorName: string;
	contractorEmail: string | null;
	jobCount: number;
	pendingBill: number;
	readyToPayAmount: number;
	charge: number;
	chargePercentage: number;
	totalPayable: number;
	statusSummary: StatusSummary[];
	jobs: (PrintJob & {
		contractorId?: number | null;
		contractorEmail?: string | null;
		chargePercentage?: number;
	})[];
};

export type JobsPrintData = {
	title: string;
	context: "jobs-page" | "payment-portal" | "payroll-report" | string;
	printedAt: Date | string;
	summary: {
		jobCount: number;
		totalAmount: number;
		totalPayable?: number;
		contractorCount?: number;
		contractorName: string;
		statusSummary?: StatusSummary[];
	};
	payroll?: {
		contractors: PayrollContractor[];
	} | null;
	jobs: PrintJob[];
};
