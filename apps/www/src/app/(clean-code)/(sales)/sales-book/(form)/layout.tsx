import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
import { CustomerProfileTaxUpdatePrompt } from "@/components/forms/sales-form/customer-profile-tax-update-prompt";
import { SalesFormFeatureSwitch } from "@/components/forms/sales-form/sales-form-feature-switch";

export default function Layout({ children }) {
    return (
        <AuthGuard can={["viewSales"]}>
            <SalesFormFeatureSwitch />
            {children}
        </AuthGuard>
    );
}
