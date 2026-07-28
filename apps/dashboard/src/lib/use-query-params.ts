import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function useQueryParams<T = {}>() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryParams = (searchParams as unknown) as Partial<T>;

  function setQueryParams(params: Partial<T>, clear = false) {
    const urlSearchParams = new URLSearchParams(
      clear ? undefined : searchParams.toString()
    );
    Object.entries(params).forEach(([key, value]) => {
      urlSearchParams.set(key, String(value));
    });

    const search = urlSearchParams.toString();
    const query = search ? `?${search}` : "";

    router.push(`${pathname}${query}`);
  }

  return { queryParams, setQueryParams };
}
