// contextFactory.ts
import {
  createContext as reactCreateContext,
  useContext as reactUseContext,
} from "react";

export default function createContextFactory<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  defaultValue?: TReturn
) {
  const Context = reactCreateContext<TReturn>(defaultValue!);

  const Provider = ({
    args,
    children,
  }: {
    args?: TArgs;
    children: React.ReactNode;
  }) => {
    const value = fn(...(args || ([] as any)));
    //@ts-ignore
    return <Context.Provider value={value}>{children}</Context.Provider>;
  };

  return {
    useContext: () => reactUseContext(Context),
    Provider,
  };
}

// export function createContext<T extends (...args: any) => any>(
//     fn: T,
//     defaultContextData?,
// ) {
//     const Context = createContextBase<ReturnType<T>>(defaultContextData);
//     return {
//         useContext: () => useContextBase(Context),
//         useInitContext: () => fn,
//         Provider: Context.Provider,
//     };
// }
