import { useState } from "react";

export interface ItemSelectionReturnType {
    selections: { [id in string]: Boolean };
    hasSelection(): Boolean;
    selectionCount(): Number;
    setSelections;
    select(index, state: any);
    clearSelection();
}
export default function useItemSelection(): ItemSelectionReturnType {
    const [selections, setSelections] = useState({});
    function selectionCount() {
        return Object.values(selections).filter(Boolean).length;
    }
    function hasSelection() {
        return selectionCount() > 0;
    }
    return {
        selections,
        hasSelection,
        selectionCount,
        setSelections,
        select(index, state) {
            setSelections((current) => {
                return {
                    ...current,
                    [index]: state,
                };
            });
        },
        clearSelection() {
            setSelections(() => {
                return {};
            });
        },
    };
}
