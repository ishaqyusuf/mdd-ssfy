import { createContext, useContext } from "react";
import { useBaseSalesBookFormContext } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_hooks/use-sales-book-form";

export const SalesBookFormContext =
    createContext<ReturnType<typeof useBaseSalesBookFormContext>>(null);
export const useSalesBookFormContext = () => useContext(SalesBookFormContext);
