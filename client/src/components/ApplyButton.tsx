"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useCreateApplicationMutation } from "@/state/api";
import { X, Send, Loader } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface ApplyButtonProps {
  property: any;
}

export default function ApplyButton({ property }: ApplyButtonProps) {
  const { user } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [createApplication, { isLoading }] = useCreateApplicationMutation();

  const [formData, setFormData] = useState({
    name: user?.fullName || "",
    email: user?.emailAddresses?.[0]?.emailAddress || "",
    phoneNumber: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createApplication({
        propertyId: property.id,
        tenantClerkId: user?.id,
        applicationDate: new Date().toISOString(),
        status: "Pending",
        ...formData,
      }).unwrap();

      toast.success("Application submitted successfully!");
      setShowModal(false);
      
      // Reset form
      setFormData({
        name: user?.fullName || "",
        email: user?.emailAddresses?.[0]?.emailAddress || "",
        phoneNumber: "",
        message: "",
      });
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to submit application");
    }
  };

  if (!user) {
    return (
      <Link
        href="/sign-in"
        className="w-full bg-orange-500 text-white py-4 px-6 rounded-lg font-bold text-lg hover:bg-orange-600 transition shadow-lg flex items-center justify-center gap-2"
      >
        <Send className="w-5 h-5" />
        Sign In to Apply
      </Link>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full bg-orange-500 text-white py-4 px-6 rounded-lg font-bold text-lg hover:bg-orange-600 transition shadow-lg flex items-center justify-center gap-2"
      >
        <Send className="w-5 h-5" />
        Apply Now
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Apply to Rent</h2>
                  <p className="text-orange-100">{property.name}</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Monthly Rent:</span>
                  <span className="font-bold text-orange-500">GH₵{property.pricePerMonth?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Security Deposit:</span>
                  <span className="font-semibold">GH₵{property.securityDeposit?.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Message to Property Manager</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500"
                  placeholder="Tell them why you're interested..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {isLoading ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}