"use client";

import Navbar from "@/components/Navbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import Sidebar from "@/components/AppSidebar";
import { NAVBAR_HEIGHT } from "@/lib/constants";
import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useDetectUserRole } from "@/hooks/useDetectUserRole";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoaded } = useUser();
  const { role, loading } = useDetectUserRole();
  const router = useRouter();
  const pathname = usePathname();

  // 🔁 Redirect user if they enter the wrong dashboard
  useEffect(() => {
    if (!isLoaded || loading || !role) return;

    if (role === "tenant" && pathname.startsWith("/managers")) {
      router.push("/tenants/favorites", { scroll: false });
    }

    if (role === "manager" && pathname.startsWith("/tenants")) {
      router.push("/managers/properties", { scroll: false });
    }
  }, [role, pathname, router, isLoaded, loading]);

  // ⏳ Loading screen
  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // 🚫 Not logged in
  if (!user) {
    router.push("/sign-in");
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full bg-primary-100">
        <Navbar />
        <div style={{ marginTop: `${NAVBAR_HEIGHT}px` }}>
          <main className="flex">
            <Sidebar userType={role || "tenant"} />
            <div className="flex-grow transition-all duration-300">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;