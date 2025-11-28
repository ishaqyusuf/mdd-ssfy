import { Project, Task, Unit } from '../../add-job/dummy-data';

export type JobStatus =
  | 'Pending Submission'
  | 'Submitted'
  | 'In Progress'
  | 'Completed';
export type PaymentStatus = 'Unpaid' | 'Partially Paid' | 'Paid';

export type DetailedJob = {
  id: string;
  project: Project;
  unit: Unit;
  model?: string; // e.g. house model
  submissionDate?: Date;
  tasks: { task: Task; quantity: number }[];
  totalInstallCost: number;
  jobStatus: JobStatus;
  paymentStatus: PaymentStatus;
};
