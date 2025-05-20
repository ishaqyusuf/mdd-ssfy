declare module "cloudinary";
import { Primitive } from "@radix-ui/react-primitive";
import React from "react";
export type Any<T> = Partial<T> & any;

export type OmitMeta<T> = Omit<T, "meta">;

export interface IDataPage<T> {
    id;
    data: T;
}
export type MakeArray<T> = {
    [P in keyof T]: T[P][];
};

export type PrimitiveDivProps = React.ComponentPropsWithoutRef<
    typeof Primitive.div
>;
export type PageDataMeta = {
    count?;
};
