import { useEffect } from "react";
import { useLocalStorage } from "./use-local-storage";
import { nanoid } from "nanoid";

export function useGuestId() {
  const [guestId, setGuestId] = useLocalStorage("guest-id", null);

  return {
    guestId,
    reset() {
      setGuestId(nanoid());
    },
  };
}
