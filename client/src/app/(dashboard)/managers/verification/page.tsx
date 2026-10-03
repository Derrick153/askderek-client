"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Shield, Upload, Phone, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function VerificationPage() {
  const { user } = useUser();
  const [step, setStep] = useState<"phone" | "otp" | "ghana-card" | "done">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [frontCard, setFrontCard] = useState<File | null>(null);
  const [backCard, setBackCard] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState("");
  const [backPreview, setBackPreview] = useState("");
  const [loading, setLoading] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

  const getToken = async () => {
    return await (window as any).Clerk?.session?.getToken();
  };

  // ── SEND OTP ──────────────────────────────────────────
  const handleSendOTP = async () => {
    if (!phone) { toast.error("Enter your phone number"); return; }
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ phoneNumber: phone }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("OTP sent to your phone!");
        setStep("otp");
      } else {
        toast.error(data.message || "Failed to send OTP");
      }
    } catch (error) {
      toast.error("Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // ── VERIFY OTP ────────────────────────────────────────
  const handleVerifyOTP = async () => {
    if (!otp) { toast.error("Enter your OTP"); return; }
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ otp, phoneNumber: phone }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Phone verified!");
        setStep("ghana-card");
      } else {
        toast.error(data.message || "Invalid OTP");
      }
    } catch (error) {
      toast.error("Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  };

  // ── UPLOAD GHANA CARD ─────────────────────────────────
  const handleFileChange = (side: "front" | "back", file: File | null) => {
    if (!file) return;
    if (side === "front") {
      setFrontCard(file);
      setFrontPreview(URL.createObjectURL(file));
    } else {
      setBackCard(file);
      setBackPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmitVerification = async () => {
    if (!frontCard || !backCard) {
      toast.error("Please upload both sides of your Ghana Card");
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("ghanaCardFront", frontCard);
      formData.append("ghanaCardBack", backCard);
      formData.append("phoneNumber", phone);

      const res = await fetch(`${API}/managers/verification/submit`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Verification submitted! Admin will review within 24 hours.");
        setStep("done");
      } else {
        toast.error(data.message || "Failed to submit verification");
      }
    } catch (error) {
      toast.error("Failed to submit verification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-3xl font-black text-gray-900">Get Verified</h1>
          <p className="text-gray-500 mt-2">Verify your identity to build trust with tenants</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {["phone", "otp", "ghana-card"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === s ? "bg-orange-600 text-white" :
                ["phone", "otp", "ghana-card", "done"].indexOf(step) > i ? "bg-green-500 text-white" :
                "bg-gray-200 text-gray-500"
              }`}>
                {["phone", "otp", "ghana-card", "done"].indexOf(step) > i ? "✓" : i + 1}
              </div>
              {i < 2 && <div className="w-8 h-px bg-gray-300" />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          {/* Step 1 — Phone Number */}
          {step === "phone" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-gray-900 mb-2">Enter Your Phone Number</h2>
                <p className="text-gray-500 text-sm">We will send you a verification code</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0244123456"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
                <p className="text-xs text-gray-400 mt-1">Ghana number e.g. 0244123456</p>
              </div>
              <button
                onClick={handleSendOTP}
                disabled={loading}
                className="w-full bg-orange-600 text-white rounded-xl py-3 font-black hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Sending...</> : <>Send OTP<Phone className="w-4 h-4" /></>}
              </button>
            </div>
          )}

          {/* Step 2 — OTP */}
          {step === "otp" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-gray-900 mb-2">Enter Verification Code</h2>
                <p className="text-gray-500 text-sm">We sent a 6-digit code to <strong>{phone}</strong></p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">OTP Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-2xl font-black tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
              <button
                onClick={handleVerifyOTP}
                disabled={loading}
                className="w-full bg-orange-600 text-white rounded-xl py-3 font-black hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Verifying...</> : "Verify OTP"}
              </button>
              <button onClick={() => setStep("phone")} className="w-full text-gray-500 text-sm hover:text-gray-700">
                ← Change phone number
              </button>
            </div>
          )}

          {/* Step 3 — Ghana Card */}
          {step === "ghana-card" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-gray-900 mb-2">Upload Ghana Card</h2>
                <p className="text-gray-500 text-sm">Upload clear photos of both sides of your Ghana Card</p>
              </div>

              {/* Front */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Front of Ghana Card</label>
                <div
                  onClick={() => document.getElementById("front-input")?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-orange-500 transition-colors"
                >
                  {frontPreview ? (
                    <img src={frontPreview} alt="Front" className="max-h-40 mx-auto rounded-lg object-cover" />
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">Click to upload front</p>
                    </div>
                  )}
                </div>
                <input id="front-input" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange("front", e.target.files?.[0] || null)} />
              </div>

              {/* Back */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Back of Ghana Card</label>
                <div
                  onClick={() => document.getElementById("back-input")?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-orange-500 transition-colors"
                >
                  {backPreview ? (
                    <img src={backPreview} alt="Back" className="max-h-40 mx-auto rounded-lg object-cover" />
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">Click to upload back</p>
                    </div>
                  )}
                </div>
                <input id="back-input" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange("back", e.target.files?.[0] || null)} />
              </div>

              <button
                onClick={handleSubmitVerification}
                disabled={loading || !frontCard || !backCard}
                className="w-full bg-orange-600 text-white rounded-xl py-3 font-black hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting...</> : <><Shield className="w-4 h-4" />Submit for Verification</>}
              </button>
            </div>
          )}

          {/* Done */}
          {step === "done" && (
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-black text-gray-900">Verification Submitted!</h2>
              <p className="text-gray-500">Our team will review your documents within 24 hours. You will receive an email once approved.</p>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-orange-700 text-sm font-semibold">✅ Phone verified<br />📋 Ghana Card submitted<br />⏳ Awaiting admin review</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
