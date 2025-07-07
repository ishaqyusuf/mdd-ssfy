"use client";

import { EmailTypes } from "@/components/_v2/email/types";
import { ModalName, dispatchSlice } from "@/store/slicers";

export function openModal<T>(name: ModalName | string, data?: T) {
    setTimeout(() => {
        dispatchSlice("modal", {
            name,
            data,
        });
    }, 1000);
}
export function closeModal(name?: ModalName | string) {
    dispatchSlice("modal", {
        name: null,
        data: null,
    });
}
export function openEmailComposer(
    data,
    extras: { type: EmailTypes; parentId?: number }
) {
    openModal("email", { data, ...extras });
}
