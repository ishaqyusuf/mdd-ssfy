import { createContext, useContext, useMemo } from "react";
import { useForm } from "react-hook-form";
import { ComponentHelperClass } from "../../../_utils/helpers/zus/step-component-class";
import { Door } from "../door-swap-modal";
import { _modal } from "@/components/common/modal/provider";
import { toast } from "sonner";
import {
    saveComponentPricingUseCase,
    updateComponentPricingUseCase,
} from "@/app/(clean-code)/(sales)/_common/use-case/sales-book-pricing-use-case";

interface DoorSizeSelectContextType {
    cls: ComponentHelperClass;
    door?: Door;
    form: ReturnType<typeof useForm>;
    routeConfig: any; // This should be more specific
    sizeList: any[]; // This should be more specific
    swapDoor: () => void;
    pickMore: () => void;
    removeSelection: () => void;
    nextStep: () => void;
    togglePriceForm: (size: string) => void;
    priceModel: any; // This should be more specific
    priceChanged: (size: string, price: number | null) => void;
}

const DoorSizeSelectContext = createContext<DoorSizeSelectContextType | null>(
    null,
);

export const useCtx = () => {
    const context = useContext(DoorSizeSelectContext);
    if (!context) {
        throw new Error("useCtx must be used within a DoorSizeSelectProvider");
    }
    return context;
};

export function useInitContext(cls: ComponentHelperClass, door?: Door) {
    const routeConfig = cls.getRouteConfig();
    const sizeList = cls?.getDoorSizeList();
    const priceModel = cls.getDoorPriceModel(cls.componentUid);

    const form = useForm({
        defaultValues: {
            selections: cls.getDoorSelections(),
        },
    });

    const swapDoor = () => {
        // Implement swap door logic
        _modal.close();
        toast.success("Door Swapped.");
    };

    const pickMore = () => {
        // Implement pick more logic
        _modal.close();
        toast.success("Picked more.");
    };

    const removeSelection = () => {
        // Implement remove selection logic
        _modal.close();
        toast.success("Selection removed.");
    };

    const nextStep = () => {
        // Implement next step logic
        _modal.close();
        toast.success("Next step.");
    };

    const togglePriceForm = (size: string) => {
        // This logic will be handled by the new modal structure
        console.log(`Toggle price form for size: ${size}`);
    };

    const priceChanged = (size: string, price: number | null) => {
        // Update the form with the new price
        form.setValue(`selections.${size}.salesPrice`, price);
        form.setValue(`selections.${size}.basePrice`, price);
    };

    return {
        cls,
        door,
        form,
        routeConfig,
        sizeList,
        swapDoor,
        pickMore,
        removeSelection,
        nextStep,
        togglePriceForm,
        priceModel,
        priceChanged,
    };
}

