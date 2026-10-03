"use client";

import { useState }         from "react";
import { useUser }          from "@clerk/nextjs";
import { useAdminMessage }  from "@/hooks/useMessage";
import { useGetAdminQuery } from "@/state/api";
import MessageThread        from "@/components/MessageThread";
import { useMessageThread } from "@/hooks/useMessage";
import {
  MessageSquare, Search, ShieldAlert,
  RefreshCw, Eye,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
//  /admin/messages/page.tsx
//  Admin view of all platform messages. Can redact flagged messages.
// ─────────────────────────────────────────────────────────────────────────────

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

function ThreadView({ enquiryId, clerkId }: { enquiryId: number; clerkId: string }) {
  const { messages, isLoading, input, setInput, handleSend, handleKeyPress, isSending } =
    useMessageThread(enquiryId);
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

export default function AdminMessagesPage() {
  const { user }   = useUser();
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [redactId, setRedactId] = useState<number | null>(null);
  const [redactReason, setRedactReason] = useState("");

  const { data: adminRaw } = useGetAdminQuery(user?.id ?? "", { skip: !user?.id });
  const adminDbId: number  = (adminRaw as any)?.id ?? 1;

  const { enquiries, isLoading, handleRedact, isRedacting, refetch } = useAdminMessage();

  const filtered = enquiries.filter((e: any) => {
    const q = search.toLowerCase();
    return !q || e.property?.name?.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">All Messages</h1>
            <p className="text-sm text-gray-500 mt-0.5">Platform-wide conversation monitoring</p>
          </div>
          <button onClick={() => refetch()} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 h-[calc(100vh-220px)]">
          <div className="lg:col-span-1 flex flex-col gap-3 overflow-y-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search threads..."
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
                <p className="text-sm text-gray-500">No threads found</p>
              </div>
            ) : (
              filtered.map((thread: any) => (
                <button
                  key={thread.id}
                  onClick={() => setSelected(thread.id)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all bg-white ${
                    selected === thread.id ? "border-orange-500 bg-orange-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Eye className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {thread.property?.name ?? "Property"}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400">
                    {thread.messages?.length ?? 0} messages
                  </p>
                </button>
              ))
            )}
          </div>
          <div className="lg:col-span-2">
            {selected && user?.id ? (
              <ThreadView enquiryId={selected} clerkId={user.id} />
            ) : (
              <div className="h-full bg-white rounded-2xl border border-gray-200 flex items-center justify-center">
                <div className="text-center">
                  <ShieldAlert className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-700">Select a thread to review</p>
                  <p className="text-xs text-gray-400 mt-1">As admin you can see all messages</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}