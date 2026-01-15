import { _setRouteParams } from "@/components/static-router";
import { useLocalSearchParams } from "expo-router";
import { createContext, useContext } from "react";

type FilterContextProps = ReturnType<typeof useCreateFilterContext>;
export const FilterContext = createContext<FilterContextProps>(
  undefined as any
);
export const FilterProvider = FilterContext.Provider;
interface Props {
  name?: string;
}
export const useCreateFilterContext = (props: Props) => {
  const ctx = useLocalSearchParams();
  return {
    filterValue: (ctx as any)?.[props.name!],
    filter(value) {
      _setRouteParams({
        [props.name!]: value,
      });
    },
  };
};
export const useFilterContext = () => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error("useFilterContext must be used within a FilterProvider");
  }
  return context;
};
