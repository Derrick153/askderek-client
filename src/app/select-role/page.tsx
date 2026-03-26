"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, Home, ArrowRight, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";

export default function RoleSelectionPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<"tenant" | "manager" | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleRoleSelection = async (role: "tenant" | "manager") => {
    if (!user || isCreating) return;
    setIsCreating(true);
    setSelectedRole(role);

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";
      const endpoint = role === "tenant" ? "tenants" : "managers";

      const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: user.id,
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User",
          email: user.emailAddresses?.[0]?.emailAddress || "",
          phoneNumber: user.phoneNumbers?.[0]?.phoneNumber || "",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create account");
      }

      await user.update({
        unsafeMetadata: { userType: role },
      });

      toast.success(`Welcome! Your ${role} account is ready.`);
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (role === "manager") {
        router.push("/managers/properties");
      } else {
        router.push("/tenants/favorites");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create account. Please try again.");
      setIsCreating(false);
      setSelectedRole(null);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-zinc-950 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-5 px-4 py-2 rounded-full border border-orange-500/30 bg-orange-500/10">
              <span className="text-base">🇬🇭</span>
              <span className="text-orange-400 font-black text-xs tracking-widest uppercase">
                Ask Derek — Tarkwa
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-3">
              How will you use{" "}
              <span className="text-orange-500 italic">AskDerek?</span>
            </h1>
            <p className="text-zinc-500 text-base">Choose your role to get started</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Tenant Card */}
            <div
              onClick={() => !isCreating && handleRoleSelection("tenant")}
              className={`group relative cursor-pointer rounded-2xl bg-zinc-900 border-2 transition-all duration-200 p-8
                ${selectedRole === "tenant" && isCreating ? "border-orange-500/60 bg-orange-500/5" : "border-zinc-800 hover:border-orange-500/40 hover:bg-zinc-800/60"}
                ${isCreating && selectedRole !== "tenant" ? "opacity-40 cursor-not-allowed" : ""}
              `}
            >
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 mb-6 group-hover:scale-105 transition-transform">
                  <Home className="h-8 w-8 text-orange-500" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">I'm a Tenant</h2>
                <p className="text-zinc-500 text-sm mb-6">Looking for a place to rent in Tarkwa</p>
                <ul className="text-left space-y-3 mb-8">
                  {["Search verified properties", "Apply to properties online", "Pay rent via MTN MoMo or Card", "Track your applications"].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-zinc-400 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  disabled={isCreating}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50 border-b-2 border-orange-700 active:border-b-0 active:translate-y-px"
                >
                  {isCreating && selectedRole === "tenant" ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Setting up...</>
                  ) : (
                    <>Continue as Tenant<ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </div>

            {/* Manager Card */}
            <div
              onClick={() => !isCreating && handleRoleSelection("manager")}
              className={`group relative cursor-pointer rounded-2xl bg-zinc-900 border-2 transition-all duration-200 p-8
                ${selectedRole === "manager" && isCreating ? "border-orange-500/60 bg-orange-500/5" : "border-zinc-800 hover:border-orange-500/40 hover:bg-zinc-800/60"}
                ${isCreating && selectedRole !== "manager" ? "opacity-40 cursor-not-allowed" : ""}
              `}
            >
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 mb-6 group-hover:scale-105 transition-transform">
                  <Building2 className="h-8 w-8 text-orange-500" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">I'm a Manager</h2>
                <p className="text-zinc-500 text-sm mb-6">I have properties to rent out</p>
                <ul className="text-left space-y-3 mb-8">
                  {["List your properties for free", "Review tenant applications", "Manage leases automatically", "Collect rent via Paystack"].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-zinc-400 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  disabled={isCreating}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50 border-b-2 border-orange-700 active:border-b-0 active:translate-y-px"
                >
                  {isCreating && selectedRole === "manager" ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Setting up...</>
                  ) : (
                    <>Continue as Manager<ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-zinc-600 font-semibold">
            No agents. No scams. Just honest housing in Tarkwa. 🇬🇭
          </p>
        </div>
      </div>
    </div>
  );
}