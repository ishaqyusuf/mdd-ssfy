import { Login01 } from "@/components/login-01";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Login | GND",
};
export default async function Page() {
    return <Login01 />;
}
