import { createContext, useContext } from "react";
import { useBaseSalesBookFormContext } from "../_hooks/use-sales-book-form";

export const SalesBookFormContext =
    createContext<ReturnType<typeof useBaseSalesBookFormContext>>(null);
export const useSalesBookFormContext = () => useContext(SalesBookFormContext);
