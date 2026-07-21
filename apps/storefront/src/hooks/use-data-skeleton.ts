import { skeletonListData } from "@/lib/utils";
import { generateRandomString, RenturnTypeAsync, timeout } from "@gnd/utils";
import { createContext, useContext, useEffect, useState } from "react";

export const DataSkeletonContext = createContext<ReturnType<
  typeof useCreateDataSkeletonCtx
> | null>(null);

export const DataSkeletonProvider = DataSkeletonContext.Provider;

interface Props<T extends (...args: any) => any> {
  defaultState?: boolean;
  loader?: T;
  autoLoad?: boolean;
  deps?: any[];
}

export const useCreateDataSkeletonCtx = <T extends (...args: any) => any>(
  props: Props<T> = {}
) => {
  const { defaultState = false, loader, autoLoad = false, deps = [] } = props;

  const [loading, setLoading] = useState(defaultState);
  const [data, setData] = useState<RenturnTypeAsync<T> | null>(null);
  const [loadToken, setLoadToken] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!loader) return;
      await timeout(50);
      setLoading(true);
      try {
        const result = await loader();
        setData(result);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
        setLoadToken(null);
      }
    }
    if (loadToken) load();
  }, [loadToken]);

  useEffect(() => {
    if (autoLoad) setLoadToken(generateRandomString());
  }, [autoLoad, ...deps]); // Ensure it reloads when dependencies change

  return {
    data,
    loading,
    setLoading,
    async load() {
      setLoadToken(generateRandomString());
    },
    renderList: skeletonListData,
  };
};

export const useDataSkeleton = () => useContext(DataSkeletonContext);
