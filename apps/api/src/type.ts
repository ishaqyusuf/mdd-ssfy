import { Primitive } from "@radix-ui/react-primitive";

export type PageDataMeta = {
  count?;
  page?;
  next?: {
    size?;
    start?;
  };
};
export type ColumnMeta = {
  preventDefault?: boolean;
  className?: string;
};
