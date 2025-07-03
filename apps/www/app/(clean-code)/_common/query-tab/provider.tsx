"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import useEffectLoader from "@/lib/use-effect-loader";
import { loadQueryTabsUseCase } from "@/use-cases/query-tab-use-case";

import { useQueryTabStore } from "./data-store";
import { openQueryTab } from "./query-tab-form";

export const QueryTabContext = createContext<QueryTab>(null as any);
export type QueryTab = ReturnType<typeof useQueryTabContext>;
export const useQueryTab = (page) => {
    const ctx = useContext(QueryTabContext);
    useEffect(() => {
        ctx.initializePage(page);
    }, [page]);
    return ctx;
};
export const useQueryTabContext = () => {
    const store = useQueryTabStore((state) => state);
    const searchParams = useSearchParams();
    const query = useMemo(() => {
        return Object.fromEntries(searchParams.entries());
    }, [searchParams]);
    function initializePage(page) {
        if (!store.allTabs?.length) loadQueries(page);
        else store.initPage(page, query);
    }
    async function loadQueries(page) {
        loadQueryTabsUseCase().then((result) => {
            store.update("allTabs", result);
            store.initPage(page, query);
        });
    }
    useEffect(() => {
        store.updateQuery(query);
    }, [query]);

    const ctx = {
        loadQueries,
        initializePage,
        createTab() {
            openQueryTab(ctx, {
                query: store.pageInfo.query,
            });
        },
    };
    return ctx;
};
export const QueryTabProvider = ({ children }) => {
    const value = useQueryTabContext();
    return (
        <QueryTabContext.Provider value={value}>
            {children}
        </QueryTabContext.Provider>
    );
};
