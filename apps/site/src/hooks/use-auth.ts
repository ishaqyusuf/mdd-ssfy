import { useSession } from "next-auth/react";

export function useAuth() {
  const { data: session } = useSession();
  return {
    id: session?.user?.id,
    email: session?.user?.email,
    name: session?.user?.name,
    can: session?.can,
    role: session?.role,
    avatar: null,
  };
}
