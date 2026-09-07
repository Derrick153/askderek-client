"use client";

import { useEffect }      from "react";
import { useAuth }        from "@clerk/nextjs";
import { setTokenGetter } from "@/lib/clerkTokenProvider";

export default function ClerkTokenSync() {
  const { getToken } = useAuth();

  useEffect(() => {
    setTokenGetter(() => getToken());
    return () => {
      setTokenGetter(async () => null);
    };
  }, [getToken]);

  return null;
}
