"use client";

import { useGetBlacklistQuery, useAddToBlacklistMutation, useRemoveFromBlacklistMutation } from "@/state/api";
import { Trash2, Plus } from "lucide-react";
import { useState } from "react";

const AdminBlacklist = () => {
  const { data: blacklist, isLoading } = useGetBlacklistQuery();
  const [addToBlacklist] = useAddToBlacklistMutation();
  const [removeFromBlacklist] = useRemoveFromBlacklistMutation();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ phoneNumber: "", email: "", ghanaCardId: "", reason: "" });

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blacklist</h1>
          <p className="text-gray-500 mt-1">{blacklist?.length || 0} banned users</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-orange-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add to Blacklist
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-5 border border-orange-200 mb-6">
          <h3 className="font-bold text-gray-900 mb-4">Ban a Scammer</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" placeholder="Phone Number" value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input type="text" placeholder="Email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input type="text" placeholder="Ghana Card ID" value={form.ghanaCardId}
              onChange={(e) => setForm({ ...form, ghanaCardId: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input type="text" placeholder="Reason (required)" value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <button
            onClick={async () => {
              await addToBlacklist(form);
              setForm({ phoneNumber: "", email: "", ghanaCardId: "", reason: "" });
              setShowForm(false);
            }}
            className="mt-3 bg-red-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-red-700"
          >
            Ban This Person
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Phone</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Email</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Reason</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Date</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody>
            {blacklist?.map((entry: any) => (
              <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-5 py-3 text-gray-700">{entry.phoneNumber || "-"}</td>
                <td className="px-5 py-3 text-gray-700">{entry.email || "-"}</td>
                <td className="px-5 py-3 text-gray-500">{entry.reason}</td>
                <td className="px-5 py-3 text-gray-400 text-xs">{new Date(entry.createdAt).toLocaleDateString()}</td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => removeFromBlacklist(entry.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminBlacklist;