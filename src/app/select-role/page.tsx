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
    if (!user) return;

    setIsCreating(true);
    setSelectedRole(role);

    try {
      // Create user in database
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
        throw new Error(error.message || "Failed to create user");
      }

      toast.success(`Welcome! Your ${role} account has been created.`);

      // Wait a bit then redirect
      await new Promise(resolve => setTimeout(resolve, 500));

      // Redirect based on role
      if (role === "tenant") {
        router.push("/tenants/favorites");
      } else {
        router.push("/managers/properties");
      }
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Failed to create account. Please try again.");
      setIsCreating(false);
      setSelectedRole(null);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-500 opacity-20 blur-3xl animate-pulse"></div>
        <div className="absolute top-40 -left-40 h-80 w-80 rounded-full bg-purple-500 opacity-20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-5xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4">
              Welcome to <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">AskDerek</span>
            </h1>
            <p className="text-xl text-blue-100">Choose how you want to use our platform</p>
          </div>

          {/* Role Cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Tenant Card */}
            <div
              onClick={() => !isCreating && handleRoleSelection("tenant")}
              className={`group relative cursor-pointer transition-all duration-300 ${
                isCreating && selectedRole !== "tenant" ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition duration-500"></div>
              
              {/* Main card */}
              <div className="relative rounded-3xl bg-gradient-to-br from-white/10 to-white/[0.05] p-8 backdrop-blur-2xl border border-white/20 hover:border-blue-400/50 transition-all h-full">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/30 mb-6 group-hover:scale-110 transition-transform">
                    <Home className="h-10 w-10 text-blue-400" />
                  </div>
                  
                  <h2 className="text-3xl font-bold text-white mb-4">I'm a Tenant</h2>
                  <p className="text-blue-200 mb-6">Looking for a place to rent</p>
                  
                  <ul className="text-left space-y-3 mb-8">
                    <li className="flex items-start gap-3 text-blue-100">
                      <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                      </div>
                      <span>Search verified properties</span>
                    </li>
                    <li className="flex items-start gap-3 text-blue-100">
                      <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                      </div>
                      <span>Apply to properties online</span>
                    </li>
                    <li className="flex items-start gap-3 text-blue-100">
                      <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                      </div>
                      <span>Track your applications</span>
                    </li>
                    <li className="flex items-start gap-3 text-blue-100">
                      <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                      </div>
                      <span>Save favorite properties</span>
                    </li>
                  </ul>

                  <button
                    disabled={isCreating}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 group-hover:shadow-lg group-hover:shadow-blue-500/50"
                  >
                    {isCreating && selectedRole === "tenant" ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Setting up...
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
                isCreating && selectedRole !== "manager" ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition duration-500"></div>
              
              {/* Main card */}
              <div className="relative rounded-3xl bg-gradient-to-br from-white/10 to-white/[0.05] p-8 backdrop-blur-2xl border border-white/20 hover:border-purple-400/50 transition-all h-full">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30 mb-6 group-hover:scale-110 transition-transform">
                    <Building2 className="h-10 w-10 text-purple-400" />
                  </div>
                  
                  <h2 className="text-3xl font-bold text-white mb-4">I'm a Manager</h2>
                  <p className="text-purple-200 mb-6">I have properties to rent</p>
                  
                  <ul className="text-left space-y-3 mb-8">
                    <li className="flex items-start gap-3 text-purple-100">
                      <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                      </div>
                      <span>List unlimited properties</span>
                    </li>
                    <li className="flex items-start gap-3 text-purple-100">
                      <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                      </div>
                      <span>Review tenant applications</span>
                    </li>
                    <li className="flex items-start gap-3 text-purple-100">
                      <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                      </div>
                      <span>Manage lease agreements</span>
                    </li>
                    <li className="flex items-start gap-3 text-purple-100">
                      <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                      </div>
                      <span>Track payments & tenants</span>
                    </li>
                  </ul>

                  <button
                    disabled={isCreating}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 group-hover:shadow-lg group-hover:shadow-purple-500/50"
                  >
                    {isCreating && selectedRole === "manager" ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Setting up...
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

          {/* Footer note */}
          <p className="text-center text-sm text-blue-200/60">
            You can always change your account type later in settings
          </p>
        </div>
      </div>
    </div>
  );
}