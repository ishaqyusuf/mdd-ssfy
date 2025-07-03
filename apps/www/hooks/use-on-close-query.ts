"use client";

import { usePathname, useRouter } from "next/navigation";
import QueryString from "qs";

export const useOnCloseQuery = () => {
    const router = useRouter();
    const pathname = usePathname();
    return {
        handle(params, setParams) {
            let data = params?.onCloseQuery;
            setParams(null).then((re) => {
                if (data) {
                    // setTimeout(() => {
                    // console.log({ onCloseQuery, pathname });
                    // return;
                    router?.push(`${pathname}?${QueryString.stringify(data)}`);
                    // }, 1);
                }
            });
        },
    };
};
