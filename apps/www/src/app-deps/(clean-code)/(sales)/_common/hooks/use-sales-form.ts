import { useFormContext } from "react-hook-form";
import { DykeFormData } from "../../types";

export const useDykeForm = () => useFormContext<DykeFormData>();
