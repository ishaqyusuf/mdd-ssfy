import AuthGuard from "@/app-deps/(v2)/(loggedIn)/_components/auth-guard";

export default function Layout({ children }) {
    return <AuthGuard can={["viewSales"]}>{children}</AuthGuard>;
}
