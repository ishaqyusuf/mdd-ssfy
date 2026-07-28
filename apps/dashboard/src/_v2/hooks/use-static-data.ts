import { useEffect } from "react";
import { staticBuildersAction } from "@/app-deps/(v1)/(loggedIn)/settings/community/builders/action";
import { Builders } from "@/db";
import { store, useAppSelector } from "@/store";
import { updateStaticData } from "@/store/static-data-slice";

function useStaticData<T>(key, loader) {
    const data = useAppSelector((store) => store.staticData?.[key]);

    async function load() {
        const _data: T = await loader();
        store.dispatch(
            updateStaticData({
                key,
                data: _data,
            }),
        );
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
export const useBuilders = () =>
    useStaticData<Builders[]>("staticBuilders", staticBuildersAction);
