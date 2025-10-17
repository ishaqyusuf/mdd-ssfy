// import { Login01 } from "@/components/login-01";
import { Login01 } from "@/components/login-01";
import { Login02 } from "@/components/login-02";
import { Login03 } from "@/components/login-03";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Login | GND",
};
export default async function Page() {
    // return <Login01 />;
    const LoginTempales = [<Login03 />, <Login01 />, <Login02 />];
    return <>{LoginTempales[0]}</>;
}

