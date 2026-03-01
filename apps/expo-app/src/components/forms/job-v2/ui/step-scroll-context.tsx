import { createContext, useContext } from "react";

type StepScrollContextType = {
  scrollToY: (y: number) => void;
};

const StepScrollContext = createContext<StepScrollContextType>({
  scrollToY: () => {},
});

export function StepScrollProvider({
  value,
  children,
}: {
  value: StepScrollContextType;
  children: React.ReactNode;
}) {
  return (
    <StepScrollContext.Provider value={value}>
      {children}
    </StepScrollContext.Provider>
  );
}

export function useStepScroll() {
  return useContext(StepScrollContext);
}

