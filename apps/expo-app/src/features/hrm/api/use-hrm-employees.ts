import { _trpc } from "@/components/static-trpc";
import { useQuery } from "@tanstack/react-query";

export function useHrmEmployees() {
  return useQuery(_trpc.hrm.getEmployees.queryOptions({}));
}
