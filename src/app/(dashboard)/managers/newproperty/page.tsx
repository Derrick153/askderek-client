"use client";

import { useUser } from "@clerk/nextjs";
import { useCreatePropertyMutation } from "@/state/api";
import { useState } from "react";
import {
  Building2,
  MapPin,
  DollarSign,
  Home,
  Image as ImageIcon,
  Save,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewPropertyPage() {
  const { user, isLoaded } = useUser();
  const userId = user?.id;
  const router = useRouter();

  const [createProperty, { isLoading }] = useCreatePropertyMutation();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    pricePerMonth: "",
    beds: "",
    baths: "",
    squareFeet: "",
    propertyType: "Apartment",
    availabilityStatus: "available",
    photoUrls: "",
    city: "Tarkwa",
    state: "Western",
    address: "",
    latitude: "5.3034",
    longitude: "-1.9942",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      toast.error("You must be logged in");
      return;
    }

    try {
      const photoUrlsArray = formData.photoUrls
        .split(",")
        .map((url) => url.trim())
        .filter(Boolean);

      // ✅ FIX: API expects FormData
      const payload = new FormData();

      payload.append("name", formData.name);
      payload.append("description", formData.description);
      payload.append("pricePerMonth", formData.pricePerMonth);
      payload.append("beds", formData.beds);
      payload.append("baths", formData.baths);
      payload.append("squareFeet", formData.squareFeet);
      payload.append("propertyType", formData.propertyType);
      payload.append("availabilityStatus", formData.availabilityStatus);
      payload.append("managerClerkId", userId);

      // location (flattened)
      payload.append("city", formData.city);
      payload.append("state", formData.state);
      payload.append("address", formData.address);
      payload.append("latitude", formData.latitude);
      payload.append("longitude", formData.longitude);

      // photos
      photoUrlsArray.forEach((url) => {
        payload.append("photoUrls", url);
      });

      await createProperty(payload).unwrap();

      toast.success("Property created successfully!");
      router.push("/managers/properties");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to create property");
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/managers/properties"
          className="inline-flex items-center gap-2 text-orange-500 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Properties
        </Link>

        <h1 className="text-3xl font-bold mb-6">Add New Property</h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white p-8 rounded-lg shadow space-y-6"
        >
          <div>
            <label className="block mb-1 font-medium">Property Name</label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full border p-2 rounded"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              className="w-full border p-2 rounded"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <input
              name="pricePerMonth"
              placeholder="Price"
              value={formData.pricePerMonth}
              onChange={handleChange}
              required
              className="border p-2 rounded"
            />
            <input
              name="squareFeet"
              placeholder="Sq Ft"
              value={formData.squareFeet}
              onChange={handleChange}
              required
              className="border p-2 rounded"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <input
              name="beds"
              placeholder="Beds"
              value={formData.beds}
              onChange={handleChange}
              required
              className="border p-2 rounded"
            />
            <input
              name="baths"
              placeholder="Baths"
              value={formData.baths}
              onChange={handleChange}
              required
              className="border p-2 rounded"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">
              Photo URLs (comma separated)
            </label>
            <textarea
              name="photoUrls"
              value={formData.photoUrls}
              onChange={handleChange}
              className="w-full border p-2 rounded"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="bg-orange-500 text-white px-6 py-3 rounded w-full"
          >
            {isLoading ? "Creating..." : "Create Property"}
          </button>
        </form>
      </div>
    </div>
  );
}
