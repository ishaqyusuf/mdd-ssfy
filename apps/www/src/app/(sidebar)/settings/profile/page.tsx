import { UserLoggedInDevices } from "@/components/user-logged-in-devices";
import { UserProfileInfo } from "@/components/user-profile-info";

export default async function Page({}) {
    return (
        <div>
            <UserProfileInfo />
            <UserLoggedInDevices />
        </div>
    );
}

