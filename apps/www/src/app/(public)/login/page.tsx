// import { Login01 } from "@/components/login-01";
import { Login02 } from "@/components/login-02";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Login | GND",
};
export default async function Page() {
    // return <Login01 />;
    return (
        <>
            <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
                <div className="w-full max-w-sm md:max-w-5xl">
                    <Login02 />
                </div>
            </div>
        </>
    );
}

