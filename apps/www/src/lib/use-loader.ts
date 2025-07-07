import { useState } from "react";
import { _useAsync } from "./use-async";

export function useBool(defaultState: boolean = false) {
  // const [isBool,setBool] = useState<boolean>(defaultState)
  const loader = useLoader(defaultState);
  return {
    bool: loader.isLoading,
    isTrue: loader.isLoading,
    isFalse: !loader.isLoading,
    setBool: loader.setLoading,
    action: loader.action,
    reset: loader.reset,
  };
}
export function useLoader(defaultState: boolean = false) {
  const [isLoading, setLoading] = useState<boolean>(defaultState);
  return {
    reset() {
      setLoading(defaultState);
    },
    loading() {
      setLoading(true);
    },
    loaded() {
      setLoading(false);
    },
    isLoading,
    setLoading,
    async action<T>(fn) {
      // this.loading();
      setLoading(true);
      const resp = await _useAsync<T>(fn());
      // this.loaded();
      setLoading(false);
      return resp;
    },
  };
}
