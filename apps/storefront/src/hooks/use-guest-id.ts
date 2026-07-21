import { useEffect } from "react";
import { useLocalStorage } from "./use-local-storage";
import { nanoid } from "nanoid";

export function useGuestId() {
  const [guestId, setGuestId] = useLocalStorage("guest-id", null);

  const ctx = {
    guestId,
    reset() {
      const gid = nanoid();
      setGuestId(gid);
      return gid;
    },
    validGuestId() {
      if (!guestId) {
        return ctx.reset();
      }
      return guestId;
    },
  };
  return ctx;
}
