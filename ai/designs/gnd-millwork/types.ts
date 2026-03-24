export enum JobStatus {
  Approved = 'Approved',
  Pending = 'Pending Review',
  Draft = 'Draft',
  Paid = 'Paid',
  Processing = 'Processing'
}

export interface Job {
  id: string;
  title: string;
  date: string;
  status: JobStatus;
  amount: number;
}

export enum AdjustmentType {
  Bonus = 'Bonus',
  Expense = 'Expense',
  Deduction = 'Deduction'
}

export interface Adjustment {
  id: string;
  type: AdjustmentType;
  description: string;
  amount: number;
}

export interface Contractor {
  id: string;
  name: string;
  avatar: string;
  role: string;
  pendingAmount: number;
  status: 'online' | 'offline';
}

export interface ActivityLog {
  id: string;
  type: 'Payment' | 'Approval' | 'Submission' | 'System';
  title: string;
  description: string;
  timestamp: string;
  user?: string;
  avatar?: string;
  meta?: string;
}
