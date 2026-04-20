'use client';

import {
  getAllUsersSupportMessages,
  updateSupportMessageStatus,
} from '@/src/service/api/adminService';
import { useEffect, useState } from 'react';

export default function AdminSupportViewer() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const response = await getAllUsersSupportMessages();
        setMessages(response.data.tikcets);
        setLoading(false);
      } catch (error: any) {
        alert(error.message || 'Failed to get all users support messages');
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, []);

  const handleStatusChange = async (
    userId: string,
    ticketId: string,
    status: string
  ) => {
    setUpdatingId(ticketId);
    await updateSupportMessageStatus(userId, ticketId, status);
    setMessages((prev) =>
      prev.map((m) => (m.id === ticketId ? { ...m, status } : m))
    );
    setUpdatingId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B1020] text-gray-400 text-lg">
        Loading support messages...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1020] text-white px-8 py-10">
      <h1 className="text-4xl font-extrabold mb-10 text-transparent bg-clip-text bg-linear-to-r from-[#6C5CE7] to-[#00D1FF] text-center">
        Admin — Support Messages
      </h1>

      <div className="space-y-8 max-w-5xl mx-auto">
        {messages.length === 0 ? (
          <p className="text-gray-400 text-center">
            No support messages found.
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-lg hover:shadow-[0_0_30px_rgba(0,209,255,0.15)] transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                <p className="font-semibold text-lg text-[#00D1FF]">
                  {msg.name}{' '}
                  <span className="text-gray-400 text-sm">({msg.email})</span>
                </p>
                <p className="text-sm text-gray-400">
                  {msg.createdAt?.toDate
                    ? new Date(msg.createdAt.toDate()).toLocaleString()
                    : '—'}
                </p>
              </div>

              <p className="text-gray-200 mb-5 leading-relaxed">
                {msg.message}
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <label className="font-medium text-gray-300">Status:</label>
                <select
                  value={msg.status}
                  onChange={(e) =>
                    handleStatusChange(msg.userId, msg.id, e.target.value)
                  }
                  disabled={updatingId === msg.id}
                  className="bg-white/10 border border-white/20 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/60 transition-all"
                >
                  <option value="open" className="text-black">
                    Open
                  </option>
                  <option value="In-progress" className="text-black">
                    In Progress
                  </option>
                  <option value="Resolved" className="text-black">
                    Resolved
                  </option>
                </select>

                {updatingId === msg.id && (
                  <span className="text-sm text-[#00D1FF] animate-pulse">
                    Updating...
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
