import {
    EmployeeProfile,
    Homes,
    JobPayments,
    Jobs,
    Projects,
    Roles,
    UserDocuments,
    Users,
} from "@/db";

import { InstallCosting, InstallCostingTemplate } from "./community";

export type IUser = Omit<Users, "meta"> & {
    meta: {
        emailRespondTo;
        fromEmail;
        emailTitle;
        email;
    };
    role: Roles;
    roles: Roles[];
    employeeProfile: EmployeeProfile;
    documents: IUserDoc[];
};
export interface IUserDoc extends Omit<UserDocuments, "meta"> {
    meta: IUserDocMeta;
}
export interface IUserDocMeta {
    url;
    assetId;
}
export type IJobStatus = "Submitted" | "Assigned";
export type IJobs = Omit<Jobs, "meta" | "type" | "status"> & {
    payment: IJobPayment;
    type: IJobType;
    meta: IJobMeta;
    unit: Homes;
    homeData: HomeJobList;
    project: Projects;
    user: IUser;
    status: IJobStatus;
};
export type IJobType = "punchout" | "installation" | "Deco-Shutter";
export interface IJobMeta {
    additional_cost: number;
    taskCost: number;
    addon: number;
    costData: InstallCostingTemplate<{ qty: number; cost: number }>;
}
export type IJobPayment = JobPayments & {
    meta: {};
    user: IUser;
    jobs: IJobs[];
    payer: IUser;
    _count: {
        jobs;
    };
};
export interface HomeJobList {
    name?;
    id?;
    disabled?;
    costing?: InstallCosting;
}
export interface IRole extends Roles {
    _count: {
        RoleHasPermissions;
    };
}
export interface IRoleForm {
    roleId;
    name;

    permission: { [key in string]: boolean };
}
