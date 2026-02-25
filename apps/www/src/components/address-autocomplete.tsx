"use client";

import { Button } from "@gnd/ui/button";

import { Input } from "@gnd/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { Delete } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
// import AddressDialog from "./address-dialog";

import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
export interface AddressType {
    address1: string;
    address2: string;
    formattedAddress: string;
    city: string;
    state?: string;
    region: string;
    postalCode: string;
    country: string;
    lat: number;
    lng: number;
}

interface AddressAutoCompleteProps {
    address?: AddressType;
    setAddress: (address: AddressType) => void;
    searchInput: string;
    setSearchInput: (searchInput: string) => void;
    dialogTitle: string;
    showInlineError?: boolean;
    placeholder?: string;
}

type Prediction = {
    placePrediction: {
        placeId: string;
        place: string;
        text: { text: string };
    };
};
export default function AddressAutoComplete(props: AddressAutoCompleteProps) {
    const {
        setAddress,
        dialogTitle,
        showInlineError = true,
        searchInput,
        setSearchInput,
        placeholder,
    } = props;

    const [selectedPlaceId, setSelectedPlaceId] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const trpc = useTRPC();
    const { data: fData } = useQuery(
        trpc.google.place.queryOptions(
            {
                placeId: selectedPlaceId,
            },
            {
                enabled: !!selectedPlaceId,
                staleTime: Number.POSITIVE_INFINITY,
            },
        ),
    );
    const data = fData?.data;

    useEffect(() => {
        if (data?.address) {
            setAddress(data.address as AddressType);
            __setAddress(data.address as AddressType);
        }
    }, [data, setAddress]);
    const [address, __setAddress] = useState<any>({});
    return (
        <>
            {selectedPlaceId !== "" || address.formattedAddress ? (
                <div className="flex items-center gap-2">
                    <Input value={address?.formattedAddress} readOnly />
                    <Button
                        type="reset"
                        onClick={() => {
                            setSelectedPlaceId("");
                            __setAddress({});
                            setAddress({} as any);
                        }}
                        size="icon"
                        variant="outline"
                        className="shrink-0"
                    >
                        <Delete className="size-4" />
                    </Button>
                </div>
            ) : (
                <AddressAutoCompleteInput
                    searchInput={searchInput}
                    setSearchInput={setSearchInput}
                    selectedPlaceId={selectedPlaceId}
                    setSelectedPlaceId={setSelectedPlaceId}
                    setIsOpenDialog={setIsOpen}
                    showInlineError={showInlineError}
                    placeholder={placeholder}
                />
            )}
        </>
    );
}

interface CommonProps {
    selectedPlaceId: string;
    setSelectedPlaceId: (placeId: string) => void;
    setIsOpenDialog: (isOpen: boolean) => void;
    showInlineError?: boolean;
    searchInput: string;
    setSearchInput: (searchInput: string) => void;
    placeholder?: string;
}

function AddressAutoCompleteInput(props: CommonProps) {
    const {
        setSelectedPlaceId,
        selectedPlaceId,
        setIsOpenDialog,
        showInlineError,
        searchInput,
        setSearchInput,
        placeholder,
    } = props;
    // const [searchInput, setSearchInput] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Escape") {
            close();
        }
    };

    const debouncedSearchInput = useDebounce(searchInput, 500);

    // const { data, isLoading } = useSWR(
    //     // For real use case: /api/address/autocomplete?input=${debouncedSearchInput}
    //     `/api/address/autocomplete?input=${debouncedSearchInput}`,
    //     fetcher,
    // );
    const trpc = useTRPC();
    const { data } = useQuery(
        trpc.google.places.queryOptions(
            {
                q: debouncedSearchInput,
            },
            {
                enabled: !!debouncedSearchInput,
            },
        ),
    );

    const predictions: Prediction[] =
        data?.filter((prediction) => prediction?.placePrediction?.placeId) ||
        [];
    return (
        <div>
            <ComboboxDropdown
                placeholder={placeholder || "Search Address"}
                searchPlaceholder={placeholder || "Search Address"}
                onSelect={(item) => {
                    setSelectedPlaceId(item?.placePrediction?.placeId);
                }}
                items={predictions?.map((prediction) => ({
                    ...prediction,
                    label: prediction.placePrediction.text.text,
                    id: prediction.placePrediction.placeId,
                }))}
                onSearch={(e) => {
                    setSearchInput(e);
                }}
            ></ComboboxDropdown>
        </div>
    );
}
