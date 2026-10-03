"use client";

import { useState, useCallback } from "react";
import { useRouter }             from "next/navigation";
import { toast }                 from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
//  usePayment.ts
//
//  Custom hook — all payment logic in one place.
//  Used by tenant payment pages.
// ─────────────────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

interface InitializePaymentParams {
  leaseId: number;
  amount:  number;
  email:   string;
}

interface PaymentState {
  isLoading:    boolean;
  error:        string | null;
  reference:    string | null;
  status:       string | null;
}

export const usePayment = () => {
  const router = useRouter();

  const [state, setState] = useState<PaymentState>({
    isLoading: false,
    error:     null,
    reference: null,
    status:    null,
  });

  // ── INITIALIZE PAYMENT ──────────────────────────────────
  const initializePayment = useCallback(async (
    params: InitializePaymentParams,
    token:  string
  ) => {
    setState(s => ({ ...s, isLoading: true, error: null }));

    try {
      const res = await fetch(`${API}/payments/initialize`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to initialize payment");
      }

      setState(s => ({
        ...s,
        isLoading: false,
        reference: data.data.reference,
      }));

      // ── Redirect to Paystack ──
      window.location.href = data.data.authorization_url;
    } catch (err: any) {
      setState(s => ({
        ...s,
        isLoading: false,
        error:     err.message,
      }));
      toast.error(err.message || "Payment failed. Please try again.");
    }
  }, []);

  // ── VERIFY PAYMENT ──────────────────────────────────────
  const verifyPayment = useCallback(async (
    reference: string,
    token:     string
  ) => {
    setState(s => ({ ...s, isLoading: true, error: null }));

    try {
      const res = await fetch(`${API}/payments/verify/${reference}`, {
        headers: { "Authorization": `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Payment verification failed");
      }

      setState(s => ({
        ...s,
        isLoading: false,
        status:    data.payment?.paymentStatus ?? "unknown",
        reference,
      }));

      return data;
    } catch (err: any) {
      setState(s => ({
        ...s,
        isLoading: false,
        error:     err.message,
      }));
      toast.error(err.message || "Verification failed");
      return null;
    }
  }, []);

  // ── CHECK PAYMENT STATUS ────────────────────────────────
  const checkPaymentStatus = useCallback(async (
    reference: string,
    token:     string
  ) => {
    try {
      const res = await fetch(`${API}/payments/status/${reference}`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      const data = await res.json();
      setState(s => ({ ...s, status: data.status }));
      return data.status;
    } catch {
      return null;
    }
  }, []);

  return {
    ...state,
    initializePayment,
    verifyPayment,
    checkPaymentStatus,
  };
};