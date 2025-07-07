import { createContext, useContext } from "react";
import { DykeForm } from "../../type";
import { useFormContext } from "react-hook-form";
import { IDykeItemFormContext } from "./use-dyke-item";
import { useLegacyDykeForm } from "@/app/(clean-code)/(sales)/sales-book/(form)/_hooks/legacy-hooks";

export const DykeItemFormContext = createContext<IDykeItemFormContext>(
    {} as any
);

export const useDykeForm = () => useFormContext<DykeForm>();
export const useDykeCtx = useLegacyDykeForm;
export const useDykeItemCtx = () => useContext(DykeItemFormContext);
