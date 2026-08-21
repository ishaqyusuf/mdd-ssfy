import type { Metadata } from "next";

import { Login } from "@/components/login";

export const metadata: Metadata = {
	title: "Login | GND",
};

export default function LoginPage() {
	return <Login />;
}
