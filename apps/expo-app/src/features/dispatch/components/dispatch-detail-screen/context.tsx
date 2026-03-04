import { createContext, useContext } from "react";
import { useDispatchDetailUiState } from "./hooks/use-dispatch-detail-ui-state";

type DispatchDetailContextValue = ReturnType<typeof useDispatchDetailUiState>;

const DispatchDetailContext = createContext<DispatchDetailContextValue | null>(
  null,
);

export function DispatchDetailProvider({
  value,
  children,
}: {
  value: DispatchDetailContextValue;
  children: React.ReactNode;
}) {
  return (
    <DispatchDetailContext.Provider value={value}>
      {children}
    </DispatchDetailContext.Provider>
  );
}

export function useDispatchDetailContext() {
  const ctx = useContext(DispatchDetailContext);
  if (!ctx) {
    throw new Error(
      "useDispatchDetailContext must be used within DispatchDetailProvider",
    );
  }
  return ctx;
}
