"use client";
import Navbar from "@/components/Navbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { NAVBAR_HEIGHT } from "@/lib/constants";
import { useGetAuthUserQuery } from "@/state/api";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { data: authUser } = useGetAuthUserQuery();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (authUser) {
      const userType = authUser.userType?.toLowerCase();
      if (
        (userType === "manager" && pathname.startsWith("/search")) ||
        (userType === "manager" && pathname === "/")
      ) {
        router.push("/managers/properties", { scroll: false });
      }
    }
  }, [authUser, router, pathname]);

  return (
    // SidebarProvider must wrap Navbar here too.
    // During Next.js client-side navigation from this layout to a /tenants or
    // /managers route, usePathname() updates before the layout swaps, causing
    // Navbar's SidebarTrigger (isDashboard=true) to render without a provider.
    // Wrapping here ensures SidebarTrigger always has a context to call into.
    <SidebarProvider>
      <div className="h-full w-full">
        <Navbar />
        <main
          className="h-full flex w-full flex-col"
          style={{ paddingTop: `${NAVBAR_HEIGHT}px` }}
        >
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Layout;