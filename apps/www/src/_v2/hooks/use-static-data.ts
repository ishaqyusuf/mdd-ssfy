import { useEffect } from "react";
import { staticProjectsAction } from "@/app-deps/(v1)/_actions/community/projects";
import { staticCustomerProfilesAction } from "@/app-deps/(v1)/(loggedIn)/sales/(customers)/_actions/sales-customer-profiles";
import { staticBuildersAction } from "@/app-deps/(v1)/(loggedIn)/settings/community/builders/action";
import { getContractorsAction } from "@/app-deps/(v2)/(loggedIn)/contractors/_actions/get-job-employees";
import { getStaticProductionUsersAction } from "@/app-deps/(v2)/(loggedIn)/sales/_actions/static/get-static-production-users-action";
import {
    Builders,
    CustomerTypes,
    Projects,
    Users,
} from "@/db";
import { store, useAppSelector } from "@/store";
import { updateStaticData } from "@/store/static-data-slice";

function useStaticData<T>(key, loader, __load = true) {
    const data = useAppSelector((store) => store.staticData?.[key]);

    async function load() {
        const _data: T = await loader();
        store.dispatch(
            updateStaticData({
                key,
                data: _data,
            })
        );
        // dispatchSlice(key, deepCopy(_data));
    }
    useEffect(() => {
        // if (__load) {
        load();

        // } else {

        // }
    }, []);
    return {
        data: data as T, //: data as ISlicer[typeof key],
        load,
    };
}
export const useStaticContractors = () =>
    useStaticData<Users[]>("staticUsers", getContractorsAction);
export const useStaticProducers = () =>
    useStaticData<Awaited<ReturnType<typeof getStaticProductionUsersAction>>>(
        "staticProductionUsers",
        getStaticProductionUsersAction
    );
export const useBuilders = () =>
    useStaticData<Builders[]>("staticBuilders", staticBuildersAction);

export const useStaticProjects = (load = true) =>
    useStaticData<Projects[]>("staticProjects", staticProjectsAction, load);
export const useCustomerProfiles = () =>
    useStaticData<CustomerTypes[]>(
        "customerProfiles",
        staticCustomerProfilesAction
    );

