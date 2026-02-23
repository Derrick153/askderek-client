"use client";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sparkles } from "lucide-react";

export default function DashboardPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { router.push("/"); return; }
    const userType = user?.unsafeMetadata?.userType as string;
    if (userType === "manager") router.push("/managers/properties");
    else if (userType === "tenant") router.push("/tenants/favorites");
    else router.push("/select-role");
  }, [isLoaded, isSignedIn, user, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 border-4 border-t-orange-500 border-r-orange-400 border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 font-semibold">Redirecting you...</p>
      </div>
    </div>
  );
}
