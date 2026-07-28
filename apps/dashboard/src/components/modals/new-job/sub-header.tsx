import Portal from "@gnd/ui/custom/portal";

export function SubHeader({ children }) {
    return (
        <Portal noDelay nodeId="sub-header">
            {children}
        </Portal>
    );
}
