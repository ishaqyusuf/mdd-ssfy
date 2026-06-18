import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";

type FloatingInvoiceActionProps = {
  align?: "center" | "right" | "stretch";
  children?: ReactNode;
  className?: string;
  footerOffset?: number;
  pointerEvents?: ViewProps["pointerEvents"];
  refreshKey?: string | number | boolean | null;
  style?: StyleProp<ViewStyle>;
};

export const INVOICE_FLOATING_BASE_OFFSET = 104;
export const INVOICE_FLOATING_SECONDARY_OFFSET = 168;
export const INVOICE_FLOATING_TERTIARY_OFFSET = 232;

type FloatingInvoiceActionHostContextValue = {
  registerAction: (
    id: string,
    entry: { node: ReactNode; refreshKey: string },
  ) => void;
  unregisterAction: (id: string) => void;
};

const FloatingInvoiceActionHostContext =
  createContext<FloatingInvoiceActionHostContextValue | null>(null);

export function FloatingInvoiceActionHost({
  children,
}: {
  children: ReactNode;
}) {
  const [actions, setActions] = useState<
    Record<string, { node: ReactNode; refreshKey: string }>
  >({});
  const registerAction = useCallback(
    (id: string, entry: { node: ReactNode; refreshKey: string }) => {
      setActions((current) => {
        if (current[id]?.refreshKey === entry.refreshKey) return current;
        return { ...current, [id]: entry };
      });
    },
    [],
  );
  const unregisterAction = useCallback((id: string) => {
    setActions((current) => {
      if (!Object.prototype.hasOwnProperty.call(current, id)) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);
  const value = useMemo(
    () => ({ registerAction, unregisterAction }),
    [registerAction, unregisterAction],
  );
  const actionEntries = Object.entries(actions);

  return (
    <FloatingInvoiceActionHostContext.Provider value={value}>
      <View className="relative flex-1">
        {children}
        {actionEntries.length ? (
          <View pointerEvents="box-none" className="absolute inset-0 z-40">
            {actionEntries.map(([id, entry]) => (
              <Fragment key={id}>{entry.node}</Fragment>
            ))}
          </View>
        ) : null}
      </View>
    </FloatingInvoiceActionHostContext.Provider>
  );
}

export function FloatingInvoiceAction({
  align = "center",
  children,
  footerOffset = 112,
  className,
  pointerEvents,
  refreshKey,
  style,
}: FloatingInvoiceActionProps) {
  const host = useContext(FloatingInvoiceActionHostContext);
  const id = useId();
  const alignmentClass =
    align === "center"
      ? "items-center"
      : align === "right"
        ? "items-end"
        : "items-stretch";
  const action = useMemo(
    () => (
      <View
        pointerEvents="box-none"
        className={`absolute inset-x-0 z-20 px-4 ${alignmentClass} ${className || ""}`}
        style={[{ bottom: footerOffset }, style]}
      >
        <View pointerEvents={pointerEvents}>{children}</View>
      </View>
    ),
    [alignmentClass, children, className, footerOffset, pointerEvents, style],
  );
  const actionRefreshKey = String(
    refreshKey ??
      [
        align,
        className || "",
        footerOffset,
        pointerEvents || "",
        style ? "style" : "",
      ].join(":"),
  );

  useEffect(() => {
    if (!host) return;
    host.registerAction(id, { node: action, refreshKey: actionRefreshKey });
  }, [action, actionRefreshKey, host, id]);

  useEffect(() => {
    if (!host) return;
    return () => host.unregisterAction(id);
  }, [host, id]);

  return host ? null : action;
}
