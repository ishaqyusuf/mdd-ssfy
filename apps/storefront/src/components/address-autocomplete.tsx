"use client";

import { useDebounce } from "@/hooks/use-debounce";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
// import AddressDialog from "./address-dialog";
// const fetcher = (url: string) => fetch(url).then((r) => r.json());
export interface AddressType {
  address1: string;
  address2: string;
  formattedAddress: string;
  city: string;
  state?: string;
  region: string;
  postalCode: string;
  placeId: string;
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
  const { data: fData, error: trpcError } = useQuery(
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
  // console.log({ fData, trpcError, selectedPlaceId });
  // const { data: fData, isLoading } = useSWR(
  //   // For real use case: /api/address/place?placeId=${selectedPlaceId}
  //   selectedPlaceId === ""
  //     ? null
  //     : `/api/address/place?placeId=${selectedPlaceId}`,
  //   fetcher,
  //   {
  //     revalidateOnFocus: false,
  //   }
  // );
  const data = fData?.data;
  const adrAddress = data?.adrAddress;

  useEffect(() => {
    if (data?.address) {
      // const address = data.address as AddressType;
      // address.placeId = data
      setAddress(data.address as AddressType);
      __setAddress(data.address as AddressType);
    }
  }, [data, setAddress]);
  const [address, __setAddress] = useState<Partial<AddressType>>({});
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
              setAddress({} as AddressType);
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
        enabled: debouncedSearchInput.trim().length >= 3,
      },
    ),
  );

  const predictions = (data || []).flatMap((suggestion) => {
    const placeId = suggestion.placePrediction?.placeId?.trim();
    const label = suggestion.placePrediction?.text?.text?.trim();
    if (!placeId || !label) return [];
    return [
      {
        ...suggestion,
        id: placeId,
        label,
      },
    ];
  });
  return (
    <div>
      <ComboboxDropdown
        placeholder="Search Address"
        searchPlaceholder="Search Address"
        onSelect={(item) => {
          setSelectedPlaceId(item.id);
        }}
        items={predictions}
        onSearch={setSearchInput}
      />
    </div>
  );
}
