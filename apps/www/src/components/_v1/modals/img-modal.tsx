"use client";

import React from "react";
import Image from "next/image";

import { _useAsync } from "@/lib/use-async";

import BaseModal from "./base-modal";

export default function ImgModal() {
    return (
        <BaseModal<{ src: string; alt: string }>
            className="h-[550px] w-[800px]"
            onOpen={(data) => {}}
            onClose={() => {}}
            modalName="img"
            Content={({ data }) => (
                <div>
                    <Image
                        className="cursor-pointer rounded border-2"
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        src={data?.src as any}
                        alt={data?.alt as any}
                    />
                </div>
            )}
        />
    );
}
