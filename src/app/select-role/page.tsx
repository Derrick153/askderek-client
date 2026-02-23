"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Home, ArrowRight, Loader2 } from "lucide-react";
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
      const API_BASE_URL =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";
      const endpoint = role === "tenant" ? "tenants" : "managers";

      // Step 1: Create user in your database
      const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: user.id,
          name:
            `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User",
          email: user.emailAddresses?.[0]?.emailAddress || "",
          phoneNumber: user.phoneNumbers?.[0]?.phoneNumber || "",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create user in database");
      }

      // ✅ Step 2: Save userType to Clerk publicMetadata
      // This is what the middleware reads to redirect correctly
      await user.update({
        unsafeMetadata: {
          userType: role,
        },
      });

      console.log(`✅ Role set to: ${role}`);
      toast.success(
        `Welcome! Your ${role === "tenant" ? "tenant" : "manager"} account is ready.`
      );

      // Small delay so Clerk metadata propagates
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Step 3: Redirect based on role
      if (role === "manager") {
        router.push("/managers/properties");
      } else {
        router.push("/tenants/favorites");
      }
    } catch (error: any) {
      console.error("Error setting up account:", error);
      toast.error(error.message || "Failed to create account. Please try again.");
      setIsCreating(false);
      setSelectedRole(null);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-500 opacity-20 blur-3xl animate-pulse" />
        <div
          className="absolute top-40 -left-40 h-80 w-80 rounded-full bg-purple-500 opacity-20 blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-5xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-white/10 border border-white/20">
              <span className="text-2xl">🇬🇭</span>
              <span className="text-white font-semibold">Ask Derek — Tarkwa</span>
            </div>
            <h1 className="text-5xl font-bold text-white mb-4">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
                AskDerek
              </span>
            </h1>
            <p className="text-xl text-blue-100">
              Choose how you want to use the platform
            </p>
          </div>

          {/* Role Cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Tenant Card */}
            <div
              onClick={() => !isCreating && handleRoleSelection("tenant")}
              className={`group relative cursor-pointer transition-all duration-300 ${
                isCreating && selectedRole !== "tenant"
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition duration-500" />
              <div className="relative rounded-3xl bg-gradient-to-br from-white/10 to-white/[0.05] p-8 backdrop-blur-2xl border border-white/20 hover:border-blue-400/50 transition-all h-full">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/30 mb-6 group-hover:scale-110 transition-transform">
                    <Home className="h-10 w-10 text-blue-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-4">
                    I'm a Tenant
                  </h2>
                  <p className="text-blue-200 mb-6">
                    Looking for a place to rent in Tarkwa
                  </p>
                  <ul className="text-left space-y-3 mb-8">
                    {[
                      "Search verified properties",
                      "Apply to properties online",
                      "Pay rent via MTN MoMo or Card",
                      "Track your applications",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3 text-blue-100">
                        <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-blue-400" />
                        </div>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    disabled={isCreating}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isCreating && selectedRole === "tenant" ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Setting up your account...
                      </>
                    ) : (
                      <>
                        Continue as Tenant
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Manager Card */}
            <div
              onClick={() => !isCreating && handleRoleSelection("manager")}
              className={`group relative cursor-pointer transition-all duration-300 ${
                isCreating && selectedRole !== "manager"
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-red-600 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition duration-500" />
              <div className="relative rounded-3xl bg-gradient-to-br from-white/10 to-white/[0.05] p-8 backdrop-blur-2xl border border-white/20 hover:border-orange-400/50 transition-all h-full">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-400/30 mb-6 group-hover:scale-110 transition-transform">
                    <Building2 className="h-10 w-10 text-orange-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-4">
                    I'm a Manager
                  </h2>
                  <p className="text-orange-200 mb-6">
                    I have properties to rent out
                  </p>
                  <ul className="text-left space-y-3 mb-8">
                    {[
                      "List your properties for free",
                      "Review tenant applications",
                      "Manage leases automatically",
                      "Collect rent via Paystack",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3 text-orange-100">
                        <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-orange-400" />
                        </div>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    disabled={isCreating}
                    className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isCreating && selectedRole === "manager" ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Setting up your account...
                      </>
                    ) : (
                      <>
                        Continue as Manager
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-blue-200/60">
            No agents. No scams. Just honest housing in Tarkwa. 🇬🇭
          </p>
        </div>
      </div>
    </div>
  );
}