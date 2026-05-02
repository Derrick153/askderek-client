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

export const useMessageInbox = () => {
  const { data: threads, isLoading, refetch } = useGetUserThreadsQuery();

  // Unread count — threads where enquiry has not been read
  // and has not been archived
  const unreadCount = threads?.filter(
    (t: any) => !t.isRead && !t.isArchived
  ).length ?? 0;

  return {
    threads:     threads ?? [],
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
  } = useGetThreadQuery(enquiryId);

  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();

  const [input, setInput] = useState("");

  // Returns true on success false on failure
  // Caller can use return value to trigger UI feedback
  const handleSend = useCallback(async (): Promise<boolean> => {
    const content = input.trim();
    if (!content) return false;

    try {
      await sendMessage({ enquiryId, content }).unwrap();
      setInput("");
      refetch();
      return true;
    } catch {
      // Error toast handled by withToast in api.ts
      return false;
    }
  }, [enquiryId, input, sendMessage, refetch]);

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

  // Visible messages — redacted ones show placeholder in component
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

  const handleRedact = async (data: {
    messageId:    number;
    redactReason: string;
    adminDbId:    number;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      await redactMessage(data).unwrap();
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