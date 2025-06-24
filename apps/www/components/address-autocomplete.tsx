"use client";

import { Button } from "@gnd/ui/button";

import { Input } from "@gnd/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { Delete } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
// import AddressDialog from "./address-dialog";

import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
const fetcher = (url: string) => fetch(url).then((r) => r.json());
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
    address: AddressType;
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
        address,
        setAddress,
        dialogTitle,
        showInlineError = true,
        searchInput,
        setSearchInput,
        placeholder,
    } = props;

    const [selectedPlaceId, setSelectedPlaceId] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    const { data, isLoading } = useSWR(
        // For real use case: /api/address/place?placeId=${selectedPlaceId}
        selectedPlaceId === ""
            ? null
            : `/api/address/place?placeId=${selectedPlaceId}`,
        fetcher,
        {
            revalidateOnFocus: false,
        },
    );

    const adrAddress = data?.data?.adrAddress;

    useEffect(() => {
        console.log({ data });
        if (data?.data?.address) {
            setAddress(data.data.address as AddressType);
        }
    }, [data, setAddress]);

    return (
        <>
            {selectedPlaceId !== "" || address.formattedAddress ? (
                <div className="flex items-center gap-2">
                    <Input value={address?.formattedAddress} readOnly />
                    <Button
                        type="reset"
                        onClick={() => {
                            setSelectedPlaceId("");
                            // setAddress({
                            //     address1: "",
                            //     address2: "",
                            //     formattedAddress: "",
                            //     city: "",
                            //     region: "",
                            //     postalCode: "",
                            //     country: "",
                            //     lat: 0,
                            //     lng: 0,
                            // });
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

    const { data, isLoading } = useSWR(
        // For real use case: /api/address/autocomplete?input=${debouncedSearchInput}
        `/api/address/autocomplete?input=${debouncedSearchInput}`,
        fetcher,
    );

    const predictions: Prediction[] = data?.data || [];
    return (
        <div>
            <ComboboxDropdown
                placeholder="Search Address"
                onSelect={(item) => {
                    setSelectedPlaceId(item?.placePrediction?.placeId);
                }}
                items={predictions?.map((prediction) => ({
                    ...prediction,
                    label: prediction.placePrediction.text.text,
                    id: prediction.placePrediction.placeId,
                }))}
                onSearch={setSearchInput}
            ></ComboboxDropdown>
        </div>
    );
}
