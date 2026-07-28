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
  Animated,
  Easing,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import {
  shouldUpdateFloatingInvoiceAction,
  type FloatingInvoiceActionRegistryEntry,
} from "./floating-invoice-action-registry";
export {
  INVOICE_FLOATING_BASE_OFFSET,
  INVOICE_FLOATING_SECONDARY_OFFSET,
  INVOICE_FLOATING_TERTIARY_OFFSET,
} from "./floating-invoice-action-layout";

type FloatingInvoiceActionProps = {
  align?: "center" | "right" | "stretch";
  children?: ReactNode;
  className?: string;
  footerOffset?: number;
  pointerEvents?: ViewProps["pointerEvents"];
  refreshKey?: string | number | boolean | null;
  style?: StyleProp<ViewStyle>;
};

type FloatingInvoiceActionHostContextValue = {
  registerAction: (
    id: string,
    entry: FloatingInvoiceActionRegistryEntry,
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
    Record<string, FloatingInvoiceActionRegistryEntry>
  >({});
  const registerAction = useCallback(
    (id: string, entry: FloatingInvoiceActionRegistryEntry) => {
      setActions((current) => {
        if (!shouldUpdateFloatingInvoiceAction(current[id], entry)) {
          return current;
        }
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
  const animatedBottom = useMemo(() => new Animated.Value(footerOffset), []);
  const alignmentClass =
    align === "center"
      ? "items-center"
      : align === "right"
        ? "items-end"
        : "items-stretch";
  useEffect(() => {
    Animated.timing(animatedBottom, {
      toValue: footerOffset,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animatedBottom, footerOffset]);
  const action = useMemo(
    () => (
      <Animated.View
        pointerEvents="box-none"
        style={[
          {
            position: "absolute",
            left: 0,
            right: 0,
            zIndex: 20,
            paddingHorizontal: 16,
            bottom: animatedBottom,
          } as any,
          style,
        ]}
      >
        <View
          pointerEvents={pointerEvents}
          className={`${alignmentClass} ${className || ""}`}
        >
          {children}
        </View>
      </Animated.View>
    ),
    [
      alignmentClass,
      animatedBottom,
      children,
      className,
      pointerEvents,
      style,
    ],
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
