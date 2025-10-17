import React, { useContext } from "react";

export const DataPageContext = React.createContext<any>({ data: null });

export const useDataPage = <T = any>() =>
    useContext<{ data: T }>(DataPageContext);
