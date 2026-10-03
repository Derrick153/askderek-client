// ─────────────────────────────────────────────────────────────────────────────
// useMessage.ts
//
// Central hook for all messaging actions on AskDerek.
//
// Exports:
//   useMessageInbox
//   useMessageThread
//   useAdminMessage
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import {
  useSendMessageMutation,
  useGetThreadQuery,
  useGetUserThreadsQuery,
  useGetAllThreadsAdminQuery,
  useRedactMessageMutation,
  type ChatMessage,
} from "@/state/api";

// ─────────────────────────────────────────────────────────────────────────────
// USER INBOX
// ─────────────────────────────────────────────────────────────────────────────

export const useMessageInbox = () => {
  const { isLoaded, isSignedIn } = useUser();

  const {
    data: threads,
    isLoading,
    refetch,
  } = useGetUserThreadsQuery(undefined, {
    pollingInterval: 5000,
    skip: !isLoaded || !isSignedIn,
  });

  const threadList = threads ?? [];

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

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE THREAD
// ─────────────────────────────────────────────────────────────────────────────

export const useMessageThread = (enquiryId: number) => {
  const { isLoaded, isSignedIn } = useUser();

  const {
    data: messages,
    isLoading,
    refetch,
  } = useGetThreadQuery(enquiryId, {
    pollingInterval: 20000,
    skip: !enquiryId || !isLoaded || !isSignedIn,
  });

  const [sendMessage, { isLoading: isSending }] =
    useSendMessageMutation();

  const [input, setInput] = useState("");

  const handleSend = useCallback(async (): Promise<boolean> => {
    const content = input.trim();

    if (!content) return false;

    try {
      await sendMessage({
        enquiryId,
        content,
      }).unwrap();

      setInput("");
      return true;
    } catch {
      return false;
    }
  }, [enquiryId, input, sendMessage]);

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

  const redactedCount =
    visibleMessages.filter(
      (m: ChatMessage) => m.isRedacted
    ).length;

  return {
    messages: visibleMessages,
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

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────────────────────

export const useAdminMessage = (
  params?: { page?: number; limit?: number }
) => {
  const {
    data,
    isLoading,
    refetch,
  } = useGetAllThreadsAdminQuery(params ?? {});

  const [redactMessage, { isLoading: isRedacting }] =
    useRedactMessageMutation();

  const raw = data as any;

  const handleRedact = async (payload: {
    messageId: number;
    redactReason: string;
    adminDbId: number;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      await redactMessage(payload).unwrap();
      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message,
      };
    }
  };

  return {
    enquiries: raw?.enquiries ?? raw?.data ?? [],
    moderation: raw?.moderation ?? null,
    pagination: raw?.pagination ?? null,
    isLoading,
    handleRedact,
    isRedacting,
    refetch,
  };
};