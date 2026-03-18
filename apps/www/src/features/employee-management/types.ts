export interface SalesAnalytics {
    totalOrders: number;
    totalRevenue: string;
    totalCommission: string;
    pendingCommission: string;
    recentOrders: { id: number; salesNo: string; total: string; date: string }[];
}

export interface ContractorAnalytics {
    totalJobs: number;
    completedJobs: number;
    pendingJobs: number;
    totalEarnings: string;
    pendingPayout: string;
    recentJobs: { id: number; title: string; status: string; date: string }[];
}

export interface ProductionAnalytics {
    totalAssignments: number;
    completedAssignments: number;
    pendingAssignments: number;
    totalItemsProduced: number;
    recentAssignments: {
        id: number;
        item: string;
        qty: number;
        completedAt?: string;
    }[];
}

export interface EmployeeRecord {
    id: number;
    type:
        | "insurance"
        | "background-check"
        | "certification"
        | "id"
        | "other";
    title: string;
    document?: {
        id: string;
        url: string;
        filename?: string;
        mimeType?: string;
        size?: number;
    };
    expiresAt?: string;
    status: "pending" | "approved" | "rejected";
    approvedBy?: string;
    approvedAt?: string;
    notes?: string;
    createdAt: string;
}

export interface EmployeeOverview {
    user: {
        id: number;
        name: string;
        email?: string;
        phone?: string;
        roles: string[];
        profile?: string;
        createdAt: string;
    };
    analytics: {
        sales?: SalesAnalytics;
        contractor?: ContractorAnalytics;
        production?: ProductionAnalytics;
    };
    records: EmployeeRecord[];
    insuranceStatus: "valid" | "expired" | "missing" | "pending";
}
