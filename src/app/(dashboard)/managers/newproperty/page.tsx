"use client";

import { useUser } from "@clerk/nextjs";
import { useCreatePropertyMutation } from "@/state/api";
import { useState, useCallback, useRef } from "react";
import {
  ArrowLeft, Building2, MapPin, Home, DollarSign,
  CheckCircle, Upload, X, Image as ImageIcon,
  ChevronRight, Loader2, Star, Zap, Shield,
  Bed, Bath, Square, PawPrint, Car,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PROPERTY_TYPES = [
  { value: "SelfContained", label: "Self-Contained", icon: "🏠" },
  { value: "Chamber", label: "Chamber & Hall", icon: "🛋️" },
  { value: "Apartment", label: "Apartment", icon: "🏢" },
  { value: "CompoundHouse", label: "Compound House", icon: "🏡" },
  { value: "Rooms", label: "Single Room", icon: "🚪" },
  { value: "Office", label: "Office Space", icon: "💼" },
  { value: "Shop", label: "Shop / Store", icon: "🏪" },
];

const HIGHLIGHTS = [
  { value: "SecurityGuard", label: "Security Guard", icon: "👮" },
  { value: "Gated", label: "Gated", icon: "🔐" },
  { value: "BackupGenerator", label: "Generator", icon: "⚡" },
  { value: "BoreHole", label: "Bore Hole", icon: "💧" },
  { value: "QuietNeighborhood", label: "Quiet Area", icon: "🌿" },
  { value: "GreatView", label: "Great View", icon: "🌄" },
  { value: "CloseToTransit", label: "Close to Transit", icon: "🚌" },
  { value: "RecentlyRenovated", label: "Renovated", icon: "✨" },
  { value: "AirConditioning", label: "Air Conditioning", icon: "❄️" },
  { value: "SatelliteTV", label: "Satellite TV", icon: "📺" },
];

const AMENITIES = [
  { value: "WiFi", label: "WiFi", icon: "📶" },
  { value: "Generator", label: "Generator", icon: "⚡" },
  { value: "WaterTank", label: "Water Tank", icon: "🚿" },
  { value: "DSTV", label: "DSTV", icon: "📡" },
  { value: "AirConditioning", label: "Air Con", icon: "❄️" },
  { value: "Parking", label: "Parking", icon: "🅿️" },
  { value: "Balcony", label: "Balcony", icon: "🌇" },
  { value: "Pool", label: "Pool", icon: "🏊" },
  { value: "Gym", label: "Gym", icon: "💪" },
  { value: "WasherDryer", label: "Washer/Dryer", icon: "🧺" },
  { value: "Refrigerator", label: "Fridge", icon: "🧊" },
  { value: "Furnished", label: "Furnished", icon: "🛋️" },
  { value: "TiledFloors", label: "Tiled Floors", icon: "🪟" },
];

const STEPS = [
  { id: 1, label: "Basic Info", icon: Home },
  { id: 2, label: "Pricing", icon: DollarSign },
  { id: 3, label: "Location", icon: MapPin },
  { id: 4, label: "Features", icon: Star },
  { id: 5, label: "Photos", icon: ImageIcon },
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export default function NewPropertyPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [createProperty, { isLoading }] = useCreatePropertyMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedImages, setUploadedImages] = useState<{ file: File; preview: string; uploading: boolean; url?: string }[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const [form, setForm] = useState({
    name: "", description: "", propertyType: "SelfContained",
    pricePerMonth: "", securityDeposit: "0", applicationFee: "0",
    beds: "1", baths: "1", squareFeet: "",
    address: "", city: "Tarkwa", state: "Western",
    latitude: "5.3034", longitude: "-1.9942",
    isPetsAllowed: false, isParkingIncluded: false,
  });

  const [selectedHighlights, setSelectedHighlights] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const toggle = (list: string[], setList: any, val: string) => {
    setList((prev: string[]) => prev.includes(val) ? prev.filter((v: string) => v !== val) : [...prev, val]);
  };

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "askderek_properties");
    formData.append("folder", "askderek");

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );

    if (!response.ok) throw new Error("Upload failed");
    const data = await response.json();
    return data.secure_url;
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 20MB limit`);
        continue;
      }

      const preview = URL.createObjectURL(file);
      const newImage = { file, preview, uploading: true };

      setUploadedImages(prev => [...prev, newImage]);

      try {
        // Try Cloudinary upload — if no cloud name, use local preview URL
        let url = preview;
        if (process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
          url = await uploadToCloudinary(file);
        }
        setUploadedImages(prev =>
          prev.map(img => img.preview === preview ? { ...img, uploading: false, url } : img)
        );
        toast.success(`${file.name} uploaded!`);
      } catch {
        setUploadedImages(prev =>
          prev.map(img => img.preview === preview ? { ...img, uploading: false, url: preview } : img)
        );
        toast.info("Image added (will upload on submit)");
      }
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeImage = (preview: string) => {
    setUploadedImages(prev => prev.filter(img => img.preview !== preview));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) { toast.error("You must be logged in"); return; }
    if (uploadedImages.length === 0) { toast.error("Please add at least one photo"); return; }

    try {
      const payload = new FormData();
      Object.entries(form).forEach(([k, v]) => payload.append(k, String(v)));
      payload.append("managerClerkId", user.id);
      payload.append("country", "Ghana");
      payload.append("highlights", selectedHighlights.join(","));
      payload.append("amenities", selectedAmenities.join(","));

      const imageUrls = uploadedImages.map(img => img.url || img.preview).filter(Boolean);
      imageUrls.forEach(url => payload.append("photoUrls", url));

      await createProperty(payload).unwrap();
      toast.success("🎉 Property listed on AskDerek!");
      router.push("/managers/properties");
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to create property");
    }
  };

  const canProceed = () => {
    if (currentStep === 1) return form.name && form.description && form.propertyType;
    if (currentStep === 2) return form.pricePerMonth && form.beds && form.baths;
    if (currentStep === 3) return form.address;
    if (currentStep === 4) return true;
    if (currentStep === 5) return uploadedImages.length > 0;
    return true;
  };

  if (!isLoaded) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <Link href="/managers/properties" className="inline-flex items-center gap-2 text-zinc-500 hover:text-orange-400 text-sm font-semibold mb-6 transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Properties
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-900/40">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">List a Property</h1>
              <p className="text-zinc-500 text-sm">Add your rental to AskDerek — Tarkwa 🇬🇭</p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            return (
              <div key={step.id} className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => isCompleted && setCurrentStep(step.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive ? "bg-orange-600 text-white shadow-lg shadow-orange-900/40" :
                    isCompleted ? "bg-zinc-800 text-orange-400 cursor-pointer hover:bg-zinc-700" :
                    "bg-zinc-900 text-zinc-600 cursor-default"
                  }`}
                >
                  {isCompleted ? <CheckCircle className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
                {index < STEPS.length - 1 && (
                  <ChevronRight className={`w-4 h-4 flex-shrink-0 ${currentStep > step.id ? "text-orange-500" : "text-zinc-700"}`} />
                )}
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSubmit}>

          {/* Step 1 — Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
                <h2 className="text-sm font-black text-white tracking-widest uppercase flex items-center gap-2">
                  <Home className="w-4 h-4 text-orange-500" /> Basic Information
                </h2>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 tracking-widest uppercase mb-2">Property Name *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="e.g. Modern Self-Contained — Tarkwa Town"
                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-orange-500 text-white placeholder-zinc-600 px-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 tracking-widest uppercase mb-2">Description *</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    required rows={4}
                    placeholder="Describe the property — size, features, nearby landmarks in Tarkwa..."
                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-orange-500 text-white placeholder-zinc-600 px-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-orange-500/20 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 tracking-widest uppercase mb-3">Property Type *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PROPERTY_TYPES.map(type => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setForm({ ...form, propertyType: type.value })}
                        className={`flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold border transition-all ${
                          form.propertyType === type.value
                            ? "bg-orange-600/20 border-orange-500 text-orange-300"
                            : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                        }`}
                      >
                        <span>{type.icon}</span>
                        <span className="text-xs">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Pricing */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
                <h2 className="text-sm font-black text-white tracking-widest uppercase flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-orange-500" /> Pricing & Details
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-zinc-400 tracking-widest uppercase mb-2">Monthly Rent (GH₵) *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500 font-black">₵</span>
                      <input
                        type="number"
                        value={form.pricePerMonth}
                        onChange={e => setForm({ ...form, pricePerMonth: e.target.value })}
                        required placeholder="800"
                        className="w-full bg-zinc-800 border border-zinc-700 focus:border-orange-500 text-white placeholder-zinc-600 pl-8 pr-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-orange-500/20 text-lg font-black"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-400 tracking-widest uppercase mb-2">Security Deposit (GH₵)</label>
                    <input type="number" value={form.securityDeposit} onChange={e => setForm({ ...form, securityDeposit: e.target.value })} placeholder="0"
                      className="w-full bg-zinc-800 border border-zinc-700 focus:border-orange-500 text-white placeholder-zinc-600 px-4 py-3 rounded-xl outline-none text-sm transition-all" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-400 tracking-widest uppercase mb-2">Application Fee (GH₵)</label>
                    <input type="number" value={form.applicationFee} onChange={e => setForm({ ...form, applicationFee: e.target.value })} placeholder="0"
                      className="w-full bg-zinc-800 border border-zinc-700 focus:border-orange-500 text-white placeholder-zinc-600 px-4 py-3 rounded-xl outline-none text-sm transition-all" />
                  </div>
                </div>

                {/* Beds & Baths */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 tracking-widest uppercase mb-2 flex items-center gap-1">
                      <Bed className="w-3 h-3" /> Bedrooms
                    </label>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setForm({ ...form, beds: String(Math.max(1, Number(form.beds) - 1)) })}
                        className="w-10 h-10 bg-zinc-800 border border-zinc-700 rounded-xl text-white font-black hover:border-orange-500 transition-all flex items-center justify-center">−</button>
                      <span className="flex-1 text-center text-white font-black text-lg">{form.beds}</span>
                      <button type="button" onClick={() => setForm({ ...form, beds: String(Number(form.beds) + 1) })}
                        className="w-10 h-10 bg-zinc-800 border border-zinc-700 rounded-xl text-white font-black hover:border-orange-500 transition-all flex items-center justify-center">+</button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-400 tracking-widest uppercase mb-2 flex items-center gap-1">
                      <Bath className="w-3 h-3" /> Bathrooms
                    </label>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setForm({ ...form, baths: String(Math.max(1, Number(form.baths) - 0.5)) })}
                        className="w-10 h-10 bg-zinc-800 border border-zinc-700 rounded-xl text-white font-black hover:border-orange-500 transition-all flex items-center justify-center">−</button>
                      <span className="flex-1 text-center text-white font-black text-lg">{form.baths}</span>
                      <button type="button" onClick={() => setForm({ ...form, baths: String(Number(form.baths) + 0.5) })}
                        className="w-10 h-10 bg-zinc-800 border border-zinc-700 rounded-xl text-white font-black hover:border-orange-500 transition-all flex items-center justify-center">+</button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-400 tracking-widest uppercase mb-2 flex items-center gap-1">
                      <Square className="w-3 h-3" /> Sq. Ft
                    </label>
                    <input type="number" value={form.squareFeet} onChange={e => setForm({ ...form, squareFeet: e.target.value })} placeholder="400"
                      className="w-full bg-zinc-800 border border-zinc-700 focus:border-orange-500 text-white placeholder-zinc-600 px-3 py-3 rounded-xl outline-none text-sm transition-all text-center font-black" />
                  </div>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setForm({ ...form, isPetsAllowed: !form.isPetsAllowed })}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${form.isPetsAllowed ? "border-orange-500 bg-orange-600/10" : "border-zinc-700 bg-zinc-800 hover:border-zinc-600"}`}>
                    <PawPrint className={`w-5 h-5 ${form.isPetsAllowed ? "text-orange-400" : "text-zinc-500"}`} />
                    <div className="text-left">
                      <p className={`text-sm font-bold ${form.isPetsAllowed ? "text-orange-300" : "text-zinc-400"}`}>Pets Allowed</p>
                      <p className="text-xs text-zinc-600">{form.isPetsAllowed ? "Yes ✓" : "No"}</p>
                    </div>
                  </button>

                  <button type="button" onClick={() => setForm({ ...form, isParkingIncluded: !form.isParkingIncluded })}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${form.isParkingIncluded ? "border-orange-500 bg-orange-600/10" : "border-zinc-700 bg-zinc-800 hover:border-zinc-600"}`}>
                    <Car className={`w-5 h-5 ${form.isParkingIncluded ? "text-orange-400" : "text-zinc-500"}`} />
                    <div className="text-left">
                      <p className={`text-sm font-bold ${form.isParkingIncluded ? "text-orange-300" : "text-zinc-400"}`}>Parking</p>
                      <p className="text-xs text-zinc-600">{form.isParkingIncluded ? "Included ✓" : "Not included"}</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Location */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
                <h2 className="text-sm font-black text-white tracking-widest uppercase flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-500" /> Location
                </h2>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 tracking-widest uppercase mb-2">Street Address *</label>
                  <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} required
                    placeholder="e.g. Tarkwa-Aboso Road, near Ghana Commercial Bank"
                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-orange-500 text-white placeholder-zinc-600 px-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-orange-500/20" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 tracking-widest uppercase mb-2">City</label>
                    <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 focus:border-orange-500 text-white px-4 py-3 rounded-xl outline-none text-sm transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 tracking-widest uppercase mb-2">Region</label>
                    <input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 focus:border-orange-500 text-white px-4 py-3 rounded-xl outline-none text-sm transition-all" />
                  </div>
                </div>

                <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-orange-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-zinc-300">Default coordinates set to Tarkwa</p>
                    <p className="text-xs text-zinc-500">Lat: {form.latitude} · Lng: {form.longitude}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4 — Features */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
                <h2 className="text-sm font-black text-white tracking-widest uppercase flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500" /> Highlights
                </h2>
                <p className="text-zinc-500 text-xs">Select features that make this property stand out</p>
                <div className="flex flex-wrap gap-2">
                  {HIGHLIGHTS.map(h => (
                    <button key={h.value} type="button"
                      onClick={() => toggle(selectedHighlights, setSelectedHighlights, h.value)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                        selectedHighlights.includes(h.value)
                          ? "bg-orange-600/20 border-orange-500 text-orange-300 scale-105"
                          : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                      }`}>
                      <span>{h.icon}</span> {h.label}
                      {selectedHighlights.includes(h.value) && <CheckCircle className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
                <h2 className="text-sm font-black text-white tracking-widest uppercase flex items-center gap-2">
                  <Shield className="w-4 h-4 text-orange-500" /> Amenities
                </h2>
                <p className="text-zinc-500 text-xs">Select all available amenities</p>
                <div className="flex flex-wrap gap-2">
                  {AMENITIES.map(a => (
                    <button key={a.value} type="button"
                      onClick={() => toggle(selectedAmenities, setSelectedAmenities, a.value)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                        selectedAmenities.includes(a.value)
                          ? "bg-orange-600/20 border-orange-500 text-orange-300 scale-105"
                          : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                      }`}>
                      <span>{a.icon}</span> {a.label}
                      {selectedAmenities.includes(a.value) && <CheckCircle className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5 — Photos */}
          {currentStep === 5 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
                <h2 className="text-sm font-black text-white tracking-widest uppercase flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-orange-500" /> Property Photos
                </h2>
                <p className="text-zinc-500 text-xs">Upload up to 10 photos · Max 20MB each · JPG, PNG, WEBP</p>

                {/* Drop Zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                    dragOver
                      ? "border-orange-500 bg-orange-500/10"
                      : "border-zinc-700 hover:border-orange-500/50 hover:bg-zinc-800/50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => e.target.files && handleFiles(e.target.files)}
                  />
                  <div className="flex flex-col items-center gap-3">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${dragOver ? "bg-orange-500/20" : "bg-zinc-800"}`}>
                      <Upload className={`w-7 h-7 transition-all ${dragOver ? "text-orange-400 scale-110" : "text-zinc-500"}`} />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">
                        {dragOver ? "Drop photos here!" : "Click or drag photos here"}
                      </p>
                      <p className="text-zinc-500 text-xs mt-1">Supports JPG, PNG, WEBP up to 20MB</p>
                    </div>
                    <div className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-500 transition-colors">
                      Browse Files
                    </div>
                  </div>
                </div>

                {/* Image Grid */}
                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {uploadedImages.map((img, index) => (
                      <div key={img.preview} className="relative group aspect-square rounded-xl overflow-hidden bg-zinc-800">
                        <img src={img.preview} alt={`Property ${index + 1}`} className="w-full h-full object-cover" />

                        {/* Uploading overlay */}
                        {img.uploading && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
                          </div>
                        )}

                        {/* Success indicator */}
                        {!img.uploading && img.url && (
                          <div className="absolute top-2 left-2">
                            <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        )}

                        {/* Main photo badge */}
                        {index === 0 && (
                          <div className="absolute bottom-2 left-2">
                            <span className="px-2 py-0.5 bg-orange-600 text-white text-xs font-bold rounded-lg">Main</span>
                          </div>
                        )}

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => removeImage(img.preview)}
                          className="absolute top-2 right-2 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {uploadedImages.length > 0 && (
                  <p className="text-xs text-zinc-500 text-center">
                    {uploadedImages.length} photo{uploadedImages.length > 1 ? "s" : ""} added · First photo is the main cover
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-6">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(s => s - 1)}
                className="flex-1 bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-600 py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={() => canProceed() && setCurrentStep(s => s + 1)}
                disabled={!canProceed()}
                className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-900/30"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading || uploadedImages.length === 0}
                className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-900/30"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Publishing...</>
                ) : (
                  <>Publish on AskDerek 🇬🇭</>
                )}
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  );
}