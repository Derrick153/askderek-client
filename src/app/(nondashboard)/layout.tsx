"use client";
import Navbar from "@/components/Navbar";
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
    <div className="h-full w-full">
      <Navbar />
      <main
        className="h-full flex w-full flex-col"
        style={{ paddingTop: `${NAVBAR_HEIGHT}px` }}
      >
        {children}
      </main>
    </div>
  );
};

export default Layout;