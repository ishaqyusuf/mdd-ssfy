import { zodResolver } from "@hookform/resolvers/zod";
import {
  type Resolver,
  type UseFormProps,
  useForm,
} from "react-hook-form";
import type { z } from "zod";

export const useZodForm = <T extends z.ZodType>(
  schema: T,
  options?: Omit<UseFormProps<z.infer<T>>, "resolver">,
) => {
  return useForm<z.infer<T>>({
    resolver: zodResolver(schema as never) as Resolver<z.infer<T>>,
    ...options,
  });
};
