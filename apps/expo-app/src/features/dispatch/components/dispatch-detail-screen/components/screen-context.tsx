import { createContext, useContext, type ReactNode } from "react";

export type DispatchDetailScreenVm = {
  [key: string]: any;
};

const DispatchDetailScreenContext = createContext<DispatchDetailScreenVm | null>(
  null,
);

export function DispatchDetailScreenProvider({
  value,
  children,
}: {
  value: DispatchDetailScreenVm;
  children: ReactNode;
}) {
  return (
    <DispatchDetailScreenContext.Provider value={value}>
      {children}
    </DispatchDetailScreenContext.Provider>
  );
}

export function useDispatchDetailScreen() {
  const ctx = useContext(DispatchDetailScreenContext);
  if (!ctx) {
    throw new Error(
      "useDispatchDetailScreen must be used within DispatchDetailScreenProvider",
    );
  }
  return ctx;
}
