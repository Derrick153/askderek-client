"use client";

import { useState }          from "react";
import { useUser }           from "@clerk/nextjs";
import { useMessageInbox, useMessageThread } from "@/hooks/useMessage";
import MessageThread         from "@/components/MessageThread";
import { MessageSquare, Search, RefreshCw } from "lucide-react";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

const formatTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(iso).toLocaleDateString("en-GH", { day: "numeric", month: "short" });
};

function ThreadItem({ thread, isSelected, onClick }: { thread: any; isSelected: boolean; onClick: () => void }) {
  const lastMsg  = thread.messages?.[thread.messages.length - 1];
  const isUnread = !thread.isRead && thread.status === "NEW";
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
        isSelected ? "border-orange-500 bg-orange-50" :
        isUnread   ? "border-blue-200 bg-blue-50/30 hover:border-blue-300" :
                     "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          {isUnread && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
          <p className="text-sm font-bold text-gray-900 truncate">{thread.property?.name ?? "Property"}</p>
        </div>
        {lastMsg && <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">{formatTime(lastMsg.createdAt)}</span>}
      </div>
      <p className="text-xs text-gray-500 truncate pl-4">
        {lastMsg?.isRedacted ? "[Message removed]" : lastMsg?.content ?? thread.message ?? "No messages yet"}
      </p>
    </button>
  );
}

function ThreadView({ enquiryId, clerkId }: { enquiryId: number; clerkId: string }) {
  const { messages, isLoading, input, setInput, handleSend, handleKeyPress, isSending } = useMessageThread(enquiryId);
  return (
    <MessageThread
      messages={messages}
      currentUserClerkId={clerkId}
      input={input}
      onInputChange={setInput}
      onSend={handleSend}
      onKeyPress={handleKeyPress}
      isSending={isSending}
      isLoading={isLoading}
      className="h-full"
    />
  );
}

export default function ManagerMessagesPage() {
  const { user }   = useUser();
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const { threads, unreadCount, isLoading, refetch } = useMessageInbox();

  const filtered = threads.filter((t: any) => {
    const q = search.toLowerCase();
    return !q || t.property?.name?.toLowerCase().includes(q) || t.message?.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="text-sm text-gray-500 mt-0.5">Protected conversations with buyers</p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <div className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full">
                {unreadCount} unread
              </div>
            )}
            <button onClick={() => refetch()} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 h-[calc(100vh-220px)]">
          <div className="lg:col-span-1 flex flex-col gap-3 overflow-y-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            {isLoading ? (
              [...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">No conversations yet</p>
                <p className="text-xs text-gray-400 mt-1">Messages from buyers will appear here</p>
              </div>
            ) : (
              filtered.map((thread: any) => (
                <ThreadItem key={thread.id} thread={thread} isSelected={selected === thread.id} onClick={() => setSelected(thread.id)} />
              ))
            )}
          </div>
          <div className="lg:col-span-2">
            {selected && user?.id ? (
              <ThreadView enquiryId={selected} clerkId={user.id} />
            ) : (
              <div className="h-full bg-white rounded-2xl border border-gray-200 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">Select a conversation</p>
                  <p className="text-xs text-gray-400 mt-1">Choose a thread from the left</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}