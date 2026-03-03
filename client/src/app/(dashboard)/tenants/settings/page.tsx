"use client";

import { useUser } from "@clerk/nextjs";
import { useGetTenantQuery, useUpdateTenantSettingsMutation } from "@/state/api";
import { useState, useEffect } from "react";
import { Settings, Save, User, Mail, Phone, Home, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-black text-zinc-400 tracking-widest uppercase mb-2">{children}</label>;
}

function Input({ className = "", ...props }: any) {
  return (
    <input
      {...props}
      className={`w-full bg-zinc-800 border border-zinc-700 focus:border-orange-500 text-white placeholder-zinc-600 px-4 py-3 rounded-xl outline-none font-semibold text-sm transition-colors ${className}`}
    />
  );
}

export default function TenantSettingsPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const { data: tenant } = useGetTenantQuery(user?.id || "", { skip: !user?.id });
  const [updateTenant, { isLoading }] = useUpdateTenantSettingsMutation();

  const [form, setForm] = useState({ name: "", email: "", phoneNumber: "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (tenant) {
      setForm({ name: tenant.name || "", email: tenant.email || "", phoneNumber: tenant.phoneNumber || "" });
    } else if (user) {
      setForm({
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        email: user.primaryEmailAddress?.emailAddress || "",
        phoneNumber: user.primaryPhoneNumber?.phoneNumber || "",
      });
    }
  }, [tenant, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    try {
      await updateTenant({ userId: user.id, ...form }).unwrap();
      setSaved(true);
      toast.success("Profile updated successfully");
      setTimeout(() => setSaved(false), 3000);
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to update profile");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  if (!isLoaded) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Account Settings</h1>
            <p className="text-zinc-500 text-sm">Manage your tenant profile</p>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600/10 to-red-600/5 border-b border-zinc-800 px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-orange-600/20 border-2 border-orange-500/40 rounded-2xl flex items-center justify-center">
                <User className="w-7 h-7 text-orange-400" />
              </div>
              <div>
                <p className="font-black text-white text-lg">{form.name || "Tenant"}</p>
                <p className="text-zinc-500 text-sm">{form.email}</p>
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-blue-600/15 border border-blue-600/30 rounded-md text-xs font-bold text-blue-400">
                  <Home className="w-3 h-3" />Tenant
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <FieldLabel>Full Name</FieldLabel>
              <Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} placeholder="Your full name" />
            </div>
            <div>
              <FieldLabel>Email Address</FieldLabel>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input value={form.email} onChange={(e: any) => setForm({ ...form, email: e.target.value })} type="email" className="pl-10" placeholder="your@email.com" />
              </div>
            </div>
            <div>
              <FieldLabel>Phone Number (Ghana)</FieldLabel>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input value={form.phoneNumber} onChange={(e: any) => setForm({ ...form, phoneNumber: e.target.value })} className="pl-10" placeholder="024 XXX XXXX" />
              </div>
              <p className="text-xs text-zinc-600 mt-1.5">Used for WhatsApp contact with landlords</p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                saved ? "bg-emerald-600 text-white" : "bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/30"
              } disabled:opacity-50`}
            >
              {isLoading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
              ) : saved ? (
                <><Save className="w-4 h-4" />Saved!</>
              ) : (
                <><Save className="w-4 h-4" />Save Changes</>
              )}
            </button>
          </form>
        </div>

        {/* Auth Info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-xs font-black text-zinc-500 tracking-widest uppercase mb-4">Authentication</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Clerk ID</p>
              <p className="text-xs text-zinc-600 font-mono mt-0.5">{user?.id}</p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-950 border border-emerald-800 rounded-lg text-xs font-black text-emerald-400">Verified</span>
          </div>
        </div>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-red-950/40 border border-zinc-800 hover:border-red-800/60 text-zinc-500 hover:text-red-400 py-3.5 rounded-xl font-bold text-sm transition-all"
        >
          <LogOut className="w-4 h-4" />Sign Out
        </button>
      </div>
    </div>
  );
}