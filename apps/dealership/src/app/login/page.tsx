import { DealerAuthLayout } from "@/components/dealer-auth-layout";
import { DealerLoginForm } from "./login-form";

export default function DealerLoginPage() {
  return (
    <DealerAuthLayout
      description="Use your verified dealer credentials to continue to quotes, orders, customers, and company settings."
      eyebrow="Secure dealer access"
      title="Welcome back"
    >
      <DealerLoginForm />
    </DealerAuthLayout>
  );
}
