"use client";

import { Icons } from "@gnd/ui/icons";

import { Button } from "@gnd/ui/button";

import { Input } from "@gnd/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { useEffect, useState } from "react";

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
    placePrediction?: {
        placeId?: string;
        place?: string;
        text?: { text?: string };
    };
};

type PredictionItem = Prediction & {
    id: string;
    label: string;
};

function resolvePlaceId(prediction?: Prediction) {
    const placePrediction = prediction?.placePrediction;
    if (!placePrediction) return "";

    if (placePrediction.placeId) return placePrediction.placeId;

    // Fallback for payloads that only return place resource name: places/<id>
    const placeResource = placePrediction.place;
    if (!placeResource) return "";

    const match = /^places\/(.+)$/.exec(placeResource);
    return match?.[1] ?? "";
}

export default function AddressAutoComplete(props: AddressAutoCompleteProps) {
    const {
        setAddress,
        showInlineError = true,
        searchInput,
        setSearchInput,
        placeholder,
    } = props;

    const [selectedPlaceId, setSelectedPlaceId] = useState("");
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
                        <Icons.Delete className="size-4" />
                    </Button>
                </div>
            ) : (
                <AddressAutoCompleteInput
                    searchInput={searchInput}
                    setSearchInput={setSearchInput}
                    setSelectedPlaceId={setSelectedPlaceId}
                    showInlineError={showInlineError}
                    placeholder={placeholder}
                />
            )}
        </>
    );
}

interface CommonProps {
    setSelectedPlaceId: (placeId: string) => void;
    showInlineError?: boolean;
    searchInput: string;
    setSearchInput: (searchInput: string) => void;
    placeholder?: string;
}

function AddressAutoCompleteInput(props: CommonProps) {
    const {
        setSelectedPlaceId,
        searchInput,
        setSearchInput,
        placeholder,
    } = props;
    const [internalSearchInput, setInternalSearchInput] = useState(searchInput);

    useEffect(() => {
        setInternalSearchInput(searchInput);
    }, [searchInput]);

    const debouncedSearchInput = useDebounce(internalSearchInput, 500);

    const trpc = useTRPC();
    const { data } = useQuery(
        trpc.google.places.queryOptions(
            {
                q: debouncedSearchInput,
            },
            {
                enabled: debouncedSearchInput.trim().length > 2,
            },
        ),
    );

    const predictions = (Array.isArray(data) ? data : [])
        .map((prediction) => {
            const placeId = resolvePlaceId(prediction as Prediction);
            const label = (prediction as Prediction)?.placePrediction?.text?.text?.trim();

            if (!placeId || !label) return null;

            return {
                ...(prediction as Prediction),
                id: placeId,
                label,
            } as PredictionItem;
        })
        .filter(Boolean) as PredictionItem[];

    return (
        <div>
            <ComboboxDropdown
                placeholder={placeholder || "Search Address"}
                searchPlaceholder={placeholder || "Search Address"}
                onSelect={(item) => {
                    setSelectedPlaceId(item.id);
                }}
                items={predictions}
                onSearch={(value) => {
                    setInternalSearchInput(value);
                    setSearchInput(value);
                }}
            ></ComboboxDropdown>
        </div>
    );
}
