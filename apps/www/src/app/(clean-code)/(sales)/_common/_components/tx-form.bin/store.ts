import { dotSet } from "@/app/(clean-code)/_common/utils/utils";
import { FieldPath, FieldPathValue } from "react-hook-form";
import { create } from "zustand";

import { PaymentMethods } from "../../../types";
import {
    GetCustomerOverviewUseCase,
    GetCustomersSelectListUseCase,
} from "../../use-case/customer-use-case";

export interface Payables {
    id;
    amountDue;
    orderId;
}
const data = {
    paymentMethod: null as PaymentMethods,
    phoneNo: null,
    customerProfiles: {} as { [phoneNo in string]: GetCustomerOverviewUseCase },
    customers: [] as GetCustomersSelectListUseCase,
    selections: {} as { [orderId in string]: boolean },
    totalPay: 0,
    inProgress: false,
    terminals: [],
    customerId: undefined,
};
type Action = ReturnType<typeof funcs>;
type Data = typeof data;
type CustomerStore = Data & Action;
export type ZusFormSet = (update: (state: Data) => Partial<Data>) => void;

function funcs(set: ZusFormSet) {
    return {
        initialize: (state: Partial<Data>) =>
            set(() => ({
                ...data,
                ...state,
            })),
        reset: () =>
            set((state) => ({
                ...data,
                customers: state.customers,
                phoneNo: state.phoneNo,
                paymentMethod: state.paymentMethod,
            })),
        dotUpdate: <K extends FieldPath<Data>>(
            k: K,
            v: FieldPathValue<Data, K>,
        ) =>
            set((state) => {
                const newState = {
                    ...state,
                };
                const d = dotSet(newState);
                d.set(k, v);
                return newState;
            }),
    };
}

export const txStore = create<CustomerStore>((set) => ({
    ...data,
    ...funcs(set),
}));
