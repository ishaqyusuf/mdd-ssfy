import { FormInput } from "@gnd/ui/controls/form-input";
import { Label } from "@gnd/ui/label";
import { useFormContext } from "react-hook-form";
import AddressAutoComplete, { AddressType } from "./address-autocomplete";
import { useMemo, useState } from "react";

interface Props {
  handleAddress?: (address: AddressType, onAddress?) => void;
  formKey?: string;
}
export function AddressForm(props: Props) {
  const form = useFormContext();
  const [searchInput, setSearchInput] = useState("");
  const paths = useMemo(() => {
    const path = (k) => (props.formKey ? `${props.formKey}_${k}` : k);
    return {
      name: path("name"),
      email: path("email"),
      phone: path("phone"),
      address1: path("address1"),
      address2: path("address2"),
      city: path("city"),
      state: path("state"),
      country: path("country"),
      postalCode: path("meta.zip_code"),
      placeId: path("meta.placeId"),
    };
  }, [props.formKey]);
  const onAddress = (address) => {
    console.log({ address });
    Object.entries(paths).map(([k, v]) => {
      if (address?.[k] || k in address) form.setValue(v, address[k]);
    });
  };
  return (
    <div className="space-y-4">
      <FormInput label="Name" control={form.control} name={paths.name} />
      <div className="grid grid-cols-2 gap-4">
        <FormInput label="Email" control={form.control} name={paths.email} />
        <FormInput label="Phone" control={form.control} name={paths.phone} />
      </div>
      <div className="grid gap-4 ">
        <Label>Address</Label>
        <AddressAutoComplete
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          dialogTitle="Search Address"
          setAddress={
            props.handleAddress
              ? (address) => props.handleAddress(address, onAddress)
              : onAddress
          }
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormInput
          label="State"
          control={form.control}
          name={paths.state}
          inputProps={{
            readOnly: true,
          }}
        />
        <FormInput
          label="City"
          control={form.control}
          name={paths.city}
          inputProps={{
            readOnly: true,
          }}
        />
        <FormInput
          label="Zip Code"
          control={form.control}
          name={paths.postalCode}
          inputProps={{
            readOnly: true,
          }}
        />
      </div>
      {/* </div> */}
    </div>
  );
}
