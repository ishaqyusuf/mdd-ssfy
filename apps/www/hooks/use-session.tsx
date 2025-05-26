import { getLoggedInProfile } from "@/actions/cache/get-loggedin-profile";
import { rndTimeout } from "@/lib/timeout";
import { useAsyncMemo } from "use-async-memo";

export const useSession = () => {
    const data = useAsyncMemo(async () => {
        await rndTimeout();
        return await getLoggedInProfile(false);
    }, []);
};
