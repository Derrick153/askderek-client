import { usePathname } from "next/navigation";
import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "./ui/sidebar";
import {
  Building,
  FileText,
  Heart,
  Home,
  Menu,
  Settings,
  Shield,
  X,
  CreditCard,
  BarChart3,
} from "lucide-react";
import { NAVBAR_HEIGHT } from "@/lib/constants";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useGetApplicationsQuery } from "@/state/api";
import { useUser } from "@clerk/nextjs";

interface AppSidebarProps {
  userType: "tenant" | "manager" | "admin";
}

const AppSidebar = ({ userType }: AppSidebarProps) => {
  const pathname              = usePathname();
  const { toggleSidebar, open } = useSidebar();
  const { user }              = useUser();
  const userId                = user?.id;

  const { data: applications } = useGetApplicationsQuery(
    { userId, userType: "manager" },
    { skip: !userId || userType !== "manager" }
  );

  const pendingCount =
    applications?.filter((app: any) => app.status === "Pending").length || 0;

  const navLinks =
    userType === "manager"
      ? [
          {
            icon:  Building,
            label: "Properties",
            href:  "/managers/properties",
          },
          {
            icon:  FileText,
            label: "Applications",
            href:  "/managers/applications",
            badge: pendingCount > 0 ? pendingCount : undefined,
          },
          {
            icon:  CreditCard,
            label: "Payments",
            href:  "/managers/payments",
          },
          {
            icon:  Shield,
            label: "Get Verified",
            href:  "/managers/verification",
          },
          {
            icon:  Settings,
            label: "Settings",
            href:  "/managers/settings",
          },
        ]
      : userType === "tenant"
      ? [
          {
            icon:  Heart,
            label: "Favorites",
            href:  "/tenants/favorites",
          },
          {
            icon:  FileText,
            label: "Applications",
            href:  "/tenants/applications",
          },
          {
            icon:  Home,
            label: "Residences",
            href:  "/tenants/residences",
          },
          {
            icon:  CreditCard,
            label: "Payments",
            href:  "/tenants/payments",
          },
          {
            icon:  Settings,
            label: "Settings",
            href:  "/tenants/settings",
          },
        ]
      : userType === "admin"
      ? [
          {
            icon:  Building,
            label: "Properties",
            href:  "/admin/properties",
          },
          {
            icon:  Shield,
            label: "Verifications",
            href:  "/admin/verifications",
          },
          {
            icon:  CreditCard,
            label: "Payments",
            href:  "/admin/payments",
          },
          {
            icon:  BarChart3,
            label: "Dashboard",
            href:  "/admin/dashboard",
          },
          {
            icon:  FileText,
            label: "Audit Logs",
            href:  "/admin/audit-logs",
          },
          {
            icon:  Settings,
            label: "Settings",
            href:  "/admin/users",
          },
        ]
      : [];

  return (
    <Sidebar
      collapsible="icon"
      className="fixed left-0 bg-zinc-900 border-r border-zinc-800"
      style={{
        top:    `${NAVBAR_HEIGHT}px`,
        height: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
      }}
    >
      {/* ── Header ── */}
      <SidebarHeader className="border-b border-zinc-800">
        <SidebarMenu>
          <SidebarMenuItem>
            <div
              className={cn(
                "flex min-h-[56px] w-full items-center pt-3 mb-3",
                open ? "justify-between px-6" : "justify-center"
              )}
            >
              {open ? (
                <>
                  <div>
                    <p className="text-[9px] font-black text-orange-500 tracking-[0.3em] uppercase">
                      {userType === "manager"
                        ? "Manager"
                        : userType === "tenant"
                        ? "Tenant"
                        : "Admin"}
                    </p>
                    <h1 className="text-sm font-black text-white">
                      {userType === "manager"
                        ? "Property Portal"
                        : userType === "tenant"
                        ? "My Rentals"
                        : "Control Panel"}
                    </h1>
                  </div>
                  <button
                    onClick={toggleSidebar}
                    className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    <X className="h-4 w-4 text-zinc-500" />
                  </button>
                </>
              ) : (
                <button
                  onClick={toggleSidebar}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <Menu className="h-4 w-4 text-zinc-500" />
                </button>
              )}
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ── Nav Links ── */}
      <SidebarContent className="pt-2">
        <SidebarMenu>
          {navLinks.map((link) => {
            const isActive = pathname === link.href;

            return (
              <SidebarMenuItem key={link.href}>
                <SidebarMenuButton
                  asChild
                  className={cn(
                    "flex items-center px-4 py-6 mx-2 rounded-xl transition-all duration-150",
                    isActive
                      ? "bg-orange-600/15 border border-orange-600/30"
                      : "hover:bg-zinc-800 border border-transparent",
                    !open && "justify-center mx-1"
                  )}
                >
                  <Link href={link.href} className="w-full" scroll={false}>
                    <div className="flex items-center gap-3 w-full relative">
                      <link.icon
                        className={cn(
                          "h-5 w-5 flex-shrink-0",
                          isActive ? "text-orange-500" : "text-zinc-500"
                        )}
                      />

                      {open && (
                        <span
                          className={cn(
                            "text-sm font-bold",
                            isActive ? "text-orange-400" : "text-zinc-400"
                          )}
                        >
                          {link.label}
                        </span>
                      )}

                      {/* ── Badge open ── */}
                      {link.badge && open && (
                        <span className="ml-auto bg-orange-600 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center">
                          {link.badge > 9 ? "9+" : link.badge}
                        </span>
                      )}

                      {/* ── Badge collapsed ── */}
                      {link.badge && !open && (
                        <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                          {link.badge > 9 ? "9" : link.badge}
                        </span>
                      )}
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;