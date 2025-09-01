import { FormInput } from "@gnd/ui/controls/form-input";
import { Label } from "@gnd/ui/label";
import { useFormContext } from "react-hook-form";
import AddressAutoComplete from "./address-autocomplete";
import { useState } from "react";

interface Props {}
export function AddressForm(props: Props) {
  const form = useFormContext();
  const [searchInput, setSearchInput] = useState("");
  return (
    <div className="space-y-4">
      <FormInput label="Name" control={form.control} name="name" />
      <div className="grid grid-cols-2 gap-4">
        <FormInput label="Email" control={form.control} name="email" />
        <FormInput label="Phone" control={form.control} name="phone" />
      </div>
      <div className="grid gap-4 ">
        <Label>Address</Label>
        <AddressAutoComplete
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          dialogTitle="Search Address"
          setAddress={(address) => {
            console.log(address);
            form.setValue("address1", address.address1);
            form.setValue("address2", address.address2);
            form.setValue("city", address.city);
            form.setValue("state", address.state);
            form.setValue("country", address.country);
            form.setValue("meta.zip_code", address.postalCode);
            form.setValue("meta.placeId", address.placeId);
          }}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormInput
          label="Country"
          control={form.control}
          name="country"
          inputProps={{
            readOnly: true,
          }}
        />
        <FormInput
          label="State"
          control={form.control}
          name="state"
          inputProps={{
            readOnly: true,
          }}
        />
        <FormInput
          label="City"
          control={form.control}
          name="city"
          inputProps={{
            readOnly: true,
          }}
        />
        <FormInput
          label="Zip Code"
          control={form.control}
          name="meta.zip_code"
          inputProps={{
            readOnly: true,
          }}
        />
      </div>
    </div>
  );
}
