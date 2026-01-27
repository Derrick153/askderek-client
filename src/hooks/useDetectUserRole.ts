import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

export function useDetectUserRole() {
  const { user, isLoaded } = useUser();
  const [role, setRole] = useState<"tenant" | "manager" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !user) return;

    const API =
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

    async function detectRole() {
      try {
        const tenantRes = await fetch(`${API}/tenants/${user.id}`);
        if (tenantRes.ok) {
          setRole("tenant");
          return;
        }

        const managerRes = await fetch(`${API}/managers/${user.id}`);
        if (managerRes.ok) {
          setRole("manager");
          return;
        }

        setRole(null);
      } catch {
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    detectRole();
  }, [user, isLoaded]);

  return { role, loading };
}