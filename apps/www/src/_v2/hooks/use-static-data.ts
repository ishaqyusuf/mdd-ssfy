import { useEffect } from "react";
import { staticProjectsAction } from "@/app/(v1)/_actions/community/projects";
import { getStaticEmployeeProfiles } from "@/app/(v1)/_actions/hrm/employee-profiles";
import { staticRolesAction } from "@/app/(v1)/_actions/hrm/static-roles";
import {
    getStaticCategories,
    getStaticProducts,
} from "@/app/(v1)/_actions/sales-products/statics";
import { staticCustomerProfilesAction } from "@/app/(v1)/(loggedIn)/sales/(customers)/_actions/sales-customer-profiles";
import { staticBuildersAction } from "@/app/(v1)/(loggedIn)/settings/community/builders/action";
import { getContractorsAction } from "@/app/(v2)/(loggedIn)/contractors/_actions/get-job-employees";
import { getJobCostList } from "@/app/(v2)/(loggedIn)/contractors/_actions/job-cost-list";
import { getStaticProductionUsersAction } from "@/app/(v2)/(loggedIn)/sales/_actions/static/get-static-production-users-action";
import {
    Builders,
    CustomerTypes,
    EmployeeProfile,
    Projects,
    Roles,
    Users,
} from "@/db";
import { store, useAppSelector } from "@/store";
import { updateStaticData } from "@/store/static-data-slice";
import { IJobType } from "@/types/hrm";
import { InstallCostLine } from "@/types/settings";

export default function useStaticData<T>(key, loader, __load = true) {
    const data = useAppSelector((store) => store.staticData?.[key]);
    // console.log(key);

    async function load() {
        const _data: T = await loader();
        store.dispatch(
            updateStaticData({
                key,
                data: _data,
            }),
        );
        // dispatchSlice(key, deepCopy(_data));
    }
    useEffect(() => {
        // if (__load) {
        load();
        // console.log(key);
        // } else {
        // console.log("NOT LOADING...");
        // }
    }, []);
    return {
        data: data as T, //: data as ISlicer[typeof key],
        load,
    };
}
export const useStaticRoles = () =>
    useStaticData<Roles[]>("staticRoles", staticRolesAction);
export const useStaticContractors = () =>
    useStaticData<Users[]>("staticUsers", getContractorsAction);
export const useStaticProducers = () =>
    useStaticData<Awaited<ReturnType<typeof getStaticProductionUsersAction>>>(
        "staticProductionUsers",
        getStaticProductionUsersAction,
    );
export const useBuilders = () =>
    useStaticData<Builders[]>("staticBuilders", staticBuildersAction);

export const useStaticProjects = (load = true) =>
    useStaticData<Projects[]>("staticProjects", staticProjectsAction, load);
export const useJobCostList = (type: IJobType) =>
    useStaticData<InstallCostLine[]>(
        "staticJobCostList",
        async () => await getJobCostList(type),
    );
export const useEmployeeProfiles = () =>
    useStaticData<EmployeeProfile[]>(
        "employeeProfiles",
        getStaticEmployeeProfiles,
    );
export const useCustomerProfiles = () =>
    useStaticData<CustomerTypes[]>(
        "customerProfiles",
        staticCustomerProfilesAction,
    );

export const useStaticProductCategories = () =>
    useStaticData<any>("prodCats", getStaticCategories);
export const useStaticProducts = () =>
    useStaticData<any>("prodCats", getStaticProducts);
