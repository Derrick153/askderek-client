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
  const pathname = usePathname();
  const { user, isLoaded } = useUser();
  const { role, loading } = useDetectUserRole();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || loading || !role) return;
    if (pathname?.startsWith("/admin")) return;
    if (role === "tenant" && pathname.startsWith("/managers")) {
      router.push("/tenants/favorites", { scroll: false });
    }
    if (role === "manager" && pathname.startsWith("/tenants")) {
      router.push("/managers/properties", { scroll: false });
    }
  }, [role, pathname, router, isLoaded, loading]);

  if (pathname?.startsWith("/admin")) {
    return <>{children}</>;
  }

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-500 text-sm font-semibold">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/sign-in");
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full bg-zinc-950">
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