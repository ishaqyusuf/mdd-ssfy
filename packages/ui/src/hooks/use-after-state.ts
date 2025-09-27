import { useEffect, useRef, useState } from "react";

export function useAfterState(state, func: () => void) {
  const prevTasks = useRef(state);
  useEffect(() => {
    if (prevTasks.current && state === null) {
      func(); // <-- only runs when there *was* tasks and now it's null
    }
    prevTasks.current = state;
  }, [state, func]);
}
