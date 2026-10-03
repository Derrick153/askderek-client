"use client";

import { useRef, useEffect } from "react";
import { Send, ShieldAlert, Loader2, Lock } from "lucide-react";
import type { ChatMessage } from "@/state/api";

// ─────────────────────────────────────────────────────────────────────────────
//  MessageThread.tsx
//
//  Renders a full message thread between buyer and landlord.
//  Used on:
//    — managers/messages page
//    — tenants/messages page
//    — admin/messages page (shows redacted originals)
//
//  Features:
//    — Messages aligned left (them) / right (you)
//    — Redacted messages shown as grey placeholder
//    — Contact info filtered by backend shown as [filtered]
//    — Auto scroll to bottom on new messages
//    — Enter to send — Shift+Enter for new line
//    — Send button disabled when empty or loading
// ─────────────────────────────────────────────────────────────────────────────

interface MessageThreadProps {
  messages:        ChatMessage[];
  currentUserClerkId: string;
  input:           string;
  onInputChange:   (value: string) => void;
  onSend:          () => Promise<boolean>;
  onKeyPress:      (e: React.KeyboardEvent) => void;
  isSending:       boolean;
  isLoading:       boolean;
  disabled?:       boolean;       // true when enquiry is archived/closed
  className?:      string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GH", {
    hour:   "2-digit",
    minute: "2-digit",
  });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GH", {
    weekday: "short",
    day:     "numeric",
    month:   "short",
  });

// Group messages by date for date separators
function groupByDate(messages: ChatMessage[]): { date: string; messages: ChatMessage[] }[] {
  const groups: Record<string, ChatMessage[]> = {};
  messages.forEach((m) => {
    const key = m.createdAt.split("T")[0];
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  });
  return Object.entries(groups).map(([date, msgs]) => ({ date, messages: msgs }));
}

// ── Redacted message placeholder ─────────────────────────────────────────────

const RedactedMessage = () => (
  <div className="flex items-center gap-2 bg-gray-100 text-gray-400 rounded-xl px-4 py-2.5 text-sm italic">
    <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
    <span>This message was removed by AskDerek</span>
  </div>
);

// ── Single message bubble ─────────────────────────────────────────────────────

const MessageBubble = ({
  message,
  isOwn,
}: {
  message: ChatMessage;
  isOwn:   boolean;
}) => {
  if (message.isRedacted) {
    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
        <div className="max-w-[75%]">
          <RedactedMessage />
          <p className="text-xs text-gray-300 mt-1 text-right">
            {formatTime(message.createdAt)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] space-y-1`}>
        <div
          className={`
            px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words
            ${isOwn
              ? "bg-orange-600 text-white rounded-br-sm"
              : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
            }
          `}
        >
          {message.content}
        </div>
        <p className={`text-xs text-gray-400 ${isOwn ? "text-right" : "text-left"} px-1`}>
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
};

// ── Date separator ────────────────────────────────────────────────────────────

const DateSeparator = ({ date }: { date: string }) => (
  <div className="flex items-center gap-3 my-4">
    <div className="h-px flex-1 bg-gray-100" />
    <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
      {formatDate(`${date}T00:00:00`)}
    </span>
    <div className="h-px flex-1 bg-gray-100" />
  </div>
);

// ── Empty state ───────────────────────────────────────────────────────────────

const EmptyThread = () => (
  <div className="flex-1 flex items-center justify-center p-8">
    <div className="text-center">
      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
        <Send className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-sm font-semibold text-gray-700">No messages yet</p>
      <p className="text-xs text-gray-400 mt-1">
        Start the conversation below
      </p>
    </div>
  </div>
);

// ── Loading skeleton ──────────────────────────────────────────────────────────

const LoadingSkeleton = () => (
  <div className="flex-1 p-4 space-y-4">
    {[...Array(4)].map((_, i) => (
      <div
        key={i}
        className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
      >
        <div className={`animate-pulse bg-gray-200 rounded-2xl h-10 ${
          i % 2 === 0 ? "w-48" : "w-36"
        }`} />
      </div>
    ))}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

export default function MessageThread({
  messages,
  currentUserClerkId,
  input,
  onInputChange,
  onSend,
  onKeyPress,
  isSending,
  isLoading,
  disabled  = false,
  className = "",
}: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const grouped = groupByDate(messages);

  return (
    <div className={`flex flex-col bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden ${className}`}>

      {/* ── Messages area ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[320px] max-h-[480px]">
        {isLoading ? (
          <LoadingSkeleton />
        ) : messages.length === 0 ? (
          <EmptyThread />
        ) : (
          grouped.map(({ date, messages: dayMessages }) => (
            <div key={date}>
              <DateSeparator date={date} />
              <div className="space-y-2">
                {dayMessages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    isOwn={m.senderClerkId === currentUserClerkId}
                  />
                ))}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Protected messaging notice ── */}
      <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-t border-amber-100">
        <Lock className="w-3 h-3 text-amber-500 flex-shrink-0" />
        <p className="text-xs text-amber-600">
          Contact information is protected. Share details after completing a booking.
        </p>
      </div>

      {/* ── Input area ── */}
      <div className="border-t border-gray-200 bg-white p-3">
        {disabled ? (
          <div className="text-center py-3">
            <p className="text-xs text-gray-400 font-medium">
              This conversation is closed.
            </p>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={onKeyPress}
              placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
              rows={1}
              disabled={isSending}
              className="flex-1 resize-none px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:opacity-60 max-h-32 overflow-y-auto"
              style={{ minHeight: "44px" }}
              onInput={(e) => {
                // Auto expand textarea
                const el = e.target as HTMLTextAreaElement;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 128) + "px";
              }}
            />
            <button
              onClick={onSend}
              disabled={!input.trim() || isSending}
              className="
                w-11 h-11 flex items-center justify-center
                bg-orange-600 hover:bg-orange-700
                text-white rounded-xl transition-colors
                disabled:opacity-40 disabled:cursor-not-allowed
                flex-shrink-0
              "
              title="Send message"
            >
              {isSending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}