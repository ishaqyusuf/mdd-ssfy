export function TabFloatingAction({ children }) {
    return (
        <div className="absolute left-1/2 transform -translate-x-1/2 bottom-0">
            {children}
        </div>
    );
}
