// ─────────────────────────────────────────────────────────────────────────────
//  useMessage.ts
//
//  Central hook for all messaging actions on AskDerek.
//
//  Three hooks exported:
//    useMessageInbox  — user inbox — all conversations
//    useMessageThread — single conversation thread
//    useAdminMessage  — admin platform wide view
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import {
  useSendMessageMutation,
  useGetThreadQuery,
  useGetUserThreadsQuery,
  useGetAllThreadsAdminQuery,
  useRedactMessageMutation,
  type ChatMessage,
} from "@/state/api";

// ── USER INBOX HOOK ───────────────────────────────────────────────────────────
// Identity comes from the Clerk JWT attached by prepareHeaders in api.ts.
// No userId argument needed — backend reads from req.auth.userId.
// getUserThreads is typed as build.query<MessageThread[], void> in api.ts —
// RTK Query returns the array directly, no unwrapping needed.

export const useMessageInbox = () => {
  const { data: threads, isLoading, refetch } = useGetUserThreadsQuery(undefined, {
  pollingInterval: 5000,
});

  // threads is MessageThread[] directly — RTK Query unwraps the response.
  // Default to empty array while loading or on error.
  const threadList  = threads ?? [];
  const unreadCount = threadList.filter(
    (t) => !t.isRead && !t.isArchived
  ).length;

  return {
    threads: threadList,
    unreadCount,
    isLoading,
    refetch,
  };
};

// ── MESSAGE THREAD HOOK ───────────────────────────────────────────────────────

export const useMessageThread = (enquiryId: number) => {
  const {
    data:      messages,
    isLoading,
    refetch,
  } = useGetThreadQuery(enquiryId, {
    // Prevents a request to GET /api/messages/thread/0 when enquiryId
    // is not yet available — e.g. while the page is still loading.
    skip:            !enquiryId,
    pollingInterval: 5000,
  });
  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();

  const [input, setInput] = useState("");

  // Returns true on success, false on failure.
  // Caller can use return value to trigger UI feedback.
  // No manual refetch needed — sendMessage has invalidatesTags: ["Messages"]
  // in api.ts which automatically triggers a refetch of the active thread.
  const handleSend = useCallback(async (): Promise<boolean> => {
    const content = input.trim();
    if (!content) return false;

    try {
      await sendMessage({ enquiryId, content }).unwrap();
      setInput("");
      return true;
    } catch {
      // Error toast handled by withToast in api.ts
      return false;
    }
  }, [enquiryId, input, sendMessage]);

  // Enter sends — Shift+Enter adds new line
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const visibleMessages = messages ?? [];

  const redactedCount = messages?.filter(
    (m: ChatMessage) => m.isRedacted
  ).length ?? 0;

  return {
    messages:       visibleMessages,
    redactedCount,
    isLoading,
    input,
    setInput,
    handleSend,
    handleKeyPress,
    isSending,
    refetch,
  };
};

// ── ADMIN MESSAGE HOOK ────────────────────────────────────────────────────────

export const useAdminMessage = (params?: { page?: number; limit?: number }) => {
  const { data, isLoading, refetch } = useGetAllThreadsAdminQuery(params ?? {});

  const [redactMessage, { isLoading: isRedacting }] = useRedactMessageMutation();

  const raw = data as any;

  // Renamed parameter from `data` to `payload` — avoids shadowing the outer
  // `data` variable from useGetAllThreadsAdminQuery above.
  const handleRedact = async (payload: {
    messageId:    number;
    redactReason: string;
    adminDbId:    number;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      await redactMessage(payload).unwrap();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  };

  return {
    enquiries:  raw?.enquiries  ?? raw?.data ?? [],
    moderation: raw?.moderation ?? null,
    pagination: raw?.pagination ?? null,
    isLoading,
    handleRedact,
    isRedacting,
    refetch,
  };
};