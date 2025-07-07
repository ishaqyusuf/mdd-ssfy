import { useEffect } from "react";
import { findExistingCustomers } from "@/actions/cache/find-existing-customers";
import { useDebounce } from "@/hooks/use-debounce";
import { useFieldArray, useFormContext } from "react-hook-form";

import { CustomerFormData } from "./customer-form";

export function ExistingCustomerResolver() {
    const form = useFormContext<CustomerFormData>();
    const [customerType, phone] = form.watch(["customerType", "phoneNo"]);
    const w = useDebounce(phone, 600);
    //  useEffect(() => {
    //      findExistingCustomers({

    //      })
    //          .then((result) => {
    //              if (result) {
    //                  //
    //              }
    //          })
    //          .catch((e) => {
    //              form.setValue("existingCustomers", []);
    //          });
    //  }, [w, data?.id]);
    const existingCustomers = useFieldArray({
        control: form.control,
        name: "existingCustomers",
        keyName: "_id",
    });
    return null;
    return <div></div>;
}
