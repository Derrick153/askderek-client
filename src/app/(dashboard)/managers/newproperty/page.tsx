"use client";

import { useUser } from "@clerk/nextjs";
import { useCreatePropertyMutation } from "@/state/api";
import { useState } from "react";
import { ArrowLeft, Building2, MapPin, Home, DollarSign, Image as ImageIcon, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PROPERTY_TYPES = [
  { value: "SelfContained", label: "Self-Contained" },
  { value: "Chamber", label: "Chamber & Hall" },
  { value: "Apartment", label: "Apartment" },
  { value: "CompoundHouse", label: "Compound House" },
  { value: "Rooms", label: "Single Room" },
  { value: "Office", label: "Office Space" },
  { value: "Shop", label: "Shop / Store" },
];

const HIGHLIGHTS = [
  "SecurityGuard", "Gated", "BackupGenerator", "BoreHole",
  "QuietNeighborhood", "GreatView", "CloseToTransit", "RecentlyRenovated",
  "AirConditioning", "SatelliteTV",
];

const AMENITIES = [
  "WiFi", "Generator", "WaterTank", "DSTV", "AirConditioning",
  "Parking", "Balcony", "Pool", "Gym", "WasherDryer",
  "Refrigerator", "Furnished", "TiledFloors",
];

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

function Select({ children, className = "", ...props }: any) {
  return (
    <select
      {...props}
      className={`w-full bg-zinc-800 border border-zinc-700 focus:border-orange-500 text-white px-4 py-3 rounded-xl outline-none font-semibold text-sm transition-colors ${className}`}
    >
      {children}
    </select>
  );
}

function Section({ title, icon: Icon, children }: any) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h2 className="flex items-center gap-2 text-sm font-black text-white tracking-widest uppercase mb-5">
        <Icon className="w-4 h-4 text-orange-500" />{title}
      </h2>
      {children}
    </div>
  );
}

function ToggleChip({ label, selected, onToggle }: any) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
        selected
          ? "bg-orange-600/20 border-orange-500/60 text-orange-300"
          : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
      }`}
    >
      {selected && <CheckCircle className="w-3 h-3 inline mr-1" />}
      {label}
    </button>
  );
}

export default function NewPropertyPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [createProperty, { isLoading }] = useCreatePropertyMutation();

  const [form, setForm] = useState({
    name: "", description: "", propertyType: "SelfContained",
    pricePerMonth: "", securityDeposit: "0", applicationFee: "0",
    beds: "1", baths: "1", squareFeet: "",
    address: "", city: "Tarkwa", state: "Western",
    latitude: "5.3034", longitude: "-1.9942",
    photoUrls: "", isPetsAllowed: false, isParkingIncluded: false,
  });

  const [selectedHighlights, setSelectedHighlights] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const toggle = (list: string[], setList: any, val: string) => {
    setList((prev: string[]) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) { toast.error("You must be logged in"); return; }

    try {
      const payload = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === "photoUrls") {
          const urls = (v as string).split(",").map((u) => u.trim()).filter(Boolean);
          urls.forEach((url) => payload.append("photoUrls", url));
        } else {
          payload.append(k, String(v));
        }
      });
      payload.append("managerClerkId", user.id);
      payload.append("country", "Ghana");
      payload.append("highlights", selectedHighlights.join(","));
      payload.append("amenities", selectedAmenities.join(","));

      await createProperty(payload).unwrap();
      toast.success("Property listed successfully on Ask Derek!");
      router.push("/managers/properties");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to create property");
    }
  };

  if (!isLoaded) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <Link href="/managers/properties" className="inline-flex items-center gap-2 text-zinc-500 hover:text-orange-400 text-sm font-bold mb-5 transition-colors">
            <ArrowLeft className="w-4 h-4" />Back to Properties
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">List a Property</h1>
              <p className="text-zinc-500 text-sm">Add your rental to Ask Derek — Tarkwa</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic Info */}
          <Section title="Basic Information" icon={Home}>
            <div className="space-y-4">
              <div>
                <FieldLabel>Property Name *</FieldLabel>
                <Input name="name" value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Modern Self-Contained — Tarkwa Town" />
              </div>
              <div>
                <FieldLabel>Description *</FieldLabel>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required rows={3}
                  placeholder="Describe the property — size, features, nearby landmarks..."
                  className="w-full bg-zinc-800 border border-zinc-700 focus:border-orange-500 text-white placeholder-zinc-600 px-4 py-3 rounded-xl outline-none font-semibold text-sm transition-colors resize-none"
                />
              </div>
              <div>
                <FieldLabel>Property Type *</FieldLabel>
                <Select value={form.propertyType} onChange={(e: any) => setForm({ ...form, propertyType: e.target.value })}>
                  {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </div>
            </div>
          </Section>

          {/* Pricing */}
          <Section title="Pricing & Details" icon={DollarSign}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Monthly Rent (GH₵) *</FieldLabel>
                <Input type="number" value={form.pricePerMonth} onChange={(e: any) => setForm({ ...form, pricePerMonth: e.target.value })} required placeholder="800" />
              </div>
              <div>
                <FieldLabel>Security Deposit (GH₵)</FieldLabel>
                <Input type="number" value={form.securityDeposit} onChange={(e: any) => setForm({ ...form, securityDeposit: e.target.value })} placeholder="0" />
              </div>
              <div>
                <FieldLabel>Bedrooms *</FieldLabel>
                <Select value={form.beds} onChange={(e: any) => setForm({ ...form, beds: e.target.value })}>
                  {[1,2,3,4,5,6].map((n) => <option key={n} value={n}>{n} bedroom{n > 1 ? "s" : ""}</option>)}
                </Select>
              </div>
              <div>
                <FieldLabel>Bathrooms *</FieldLabel>
                <Select value={form.baths} onChange={(e: any) => setForm({ ...form, baths: e.target.value })}>
                  {[1, 1.5, 2, 2.5, 3].map((n) => <option key={n} value={n}>{n} bathroom{n > 1 ? "s" : ""}</option>)}
                </Select>
              </div>
              <div>
                <FieldLabel>Square Feet</FieldLabel>
                <Input type="number" value={form.squareFeet} onChange={(e: any) => setForm({ ...form, squareFeet: e.target.value })} placeholder="400" />
              </div>
              <div>
                <FieldLabel>Application Fee (GH₵)</FieldLabel>
                <Input type="number" value={form.applicationFee} onChange={(e: any) => setForm({ ...form, applicationFee: e.target.value })} placeholder="0" />
              </div>
            </div>
            <div className="flex gap-6 mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isPetsAllowed} onChange={(e) => setForm({ ...form, isPetsAllowed: e.target.checked })} className="w-4 h-4 accent-orange-600" />
                <span className="text-sm text-zinc-300 font-semibold">Pets Allowed</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isParkingIncluded} onChange={(e) => setForm({ ...form, isParkingIncluded: e.target.checked })} className="w-4 h-4 accent-orange-600" />
                <span className="text-sm text-zinc-300 font-semibold">Parking Included</span>
              </label>
            </div>
          </Section>

          {/* Location */}
          <Section title="Location" icon={MapPin}>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <FieldLabel>Street Address *</FieldLabel>
                <Input value={form.address} onChange={(e: any) => setForm({ ...form, address: e.target.value })} required placeholder="e.g. Tarkwa-Aboso Road, near Ghana Commercial Bank" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>City</FieldLabel>
                  <Input value={form.city} onChange={(e: any) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div>
                  <FieldLabel>Region</FieldLabel>
                  <Input value={form.state} onChange={(e: any) => setForm({ ...form, state: e.target.value })} />
                </div>
              </div>
            </div>
          </Section>

          {/* Highlights */}
          <Section title="Highlights" icon={CheckCircle}>
            <p className="text-zinc-500 text-xs mb-3">Select features that make this property stand out</p>
            <div className="flex flex-wrap gap-2">
              {HIGHLIGHTS.map((h) => (
                <ToggleChip key={h} label={h} selected={selectedHighlights.includes(h)} onToggle={() => toggle(selectedHighlights, setSelectedHighlights, h)} />
              ))}
            </div>
          </Section>

          {/* Amenities */}
          <Section title="Amenities" icon={CheckCircle}>
            <p className="text-zinc-500 text-xs mb-3">Select all available amenities</p>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map((a) => (
                <ToggleChip key={a} label={a} selected={selectedAmenities.includes(a)} onToggle={() => toggle(selectedAmenities, setSelectedAmenities, a)} />
              ))}
            </div>
          </Section>

          {/* Photos */}
          <Section title="Photo URLs" icon={ImageIcon}>
            <FieldLabel>Image URLs (comma separated)</FieldLabel>
            <textarea
              value={form.photoUrls}
              onChange={(e) => setForm({ ...form, photoUrls: e.target.value })}
              rows={2}
              placeholder="https://your-image.com/photo1.jpg, https://your-image.com/photo2.jpg"
              className="w-full bg-zinc-800 border border-zinc-700 focus:border-orange-500 text-white placeholder-zinc-600 px-4 py-3 rounded-xl outline-none font-semibold text-sm transition-colors resize-none"
            />
            <p className="text-xs text-zinc-600 mt-2">Upload images to Cloudinary or Imgur and paste the URLs here</p>
          </Section>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white py-4 rounded-2xl font-black text-base tracking-wide transition-all shadow-xl shadow-orange-900/30 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Publishing...</>
            ) : (
              <>Publish Property on Ask Derek 🇬🇭</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}