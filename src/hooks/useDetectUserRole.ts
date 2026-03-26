"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

export function useDetectUserRole() {
  const { user, isLoaded } = useUser();
  const [role, setRole] = useState<"tenant" | "manager" | "admin" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If Clerk isn't loaded, keep loading
    if (!isLoaded) return;

    // If no user, we aren't loading a role anymore
    if (!user) {
      setLoading(false);
      return;
    }

    async function detectRole() {
      try {
        // 1. Check Metadata first (Fastest)
        const userType = (user?.unsafeMetadata?.userType || user?.publicMetadata?.userType) as string;

        if (userType === "admin") {
          setRole("admin");
          return;
        }
        if (userType === "manager") {
          setRole("manager");
          return;
        }
        if (userType === "tenant") {
          setRole("tenant");
          return;
        }

        // 2. Fallback to API if metadata is missing
        const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";
        
        const [tenantRes, managerRes] = await Promise.allSettled([
          fetch(`${API}/tenants/${user?.id}`),
          fetch(`${API}/managers/${user?.id}`)
        ]);

        if (tenantRes.status === "fulfilled" && tenantRes.value.ok) {
          setRole("tenant");
        } else if (managerRes.status === "fulfilled" && managerRes.value.ok) {
          setRole("manager");
        } else {
          setRole(null);
        }
      } catch (error) {
        console.error("Role detection error:", error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    detectRole();
  }, [user, isLoaded]);

  return { role, loading };
}