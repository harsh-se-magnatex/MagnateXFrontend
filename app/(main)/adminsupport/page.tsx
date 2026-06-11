'use client';

import { PageLoadingState } from '@/components/shared/PageLoadingState';
import {
  getAllUsersSupportMessages,
  updateSupportMessageStatus,
  type SupportTicket,
  type SupportTicketType,
} from '@/src/service/api/adminService';
import { useEffect, useMemo, useState } from 'react';
import { showErrorToast } from '@/lib/show-error-toast';
import {
  useTimestampFormatter,
  type TimestampInput,
} from '@/lib/user-timezone';

function resolveTicketType(ticket: SupportTicket): SupportTicketType {
  if (ticket.type === 'bug' || ticket.type === 'refund' || ticket.type === 'support') {
    return ticket.type;
  }
  if (typeof ticket.message === 'string' && ticket.message.startsWith('[BUG]')) {
    return 'bug';
  }
  return 'support';
}

function TicketCard({
  msg,
  updatingId,
  onStatusChange,
}: {
  msg: SupportTicket;
  updatingId: string | null;
  onStatusChange: (userId: string, ticketId: string, status: string) => void;
}) {
  const fmtTimestamp = useTimestampFormatter();
  return (
    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-lg hover:shadow-[0_0_30px_rgba(0,209,255,0.15)] transition-all">
      <div className="flex flex-col gap-2 mb-3">
        <p className="font-semibold text-base text-[#00D1FF]">
          {msg.name}{' '}
          <span className="text-gray-400 text-sm font-normal">({msg.email})</span>
        </p>
        <p className="text-xs text-gray-400">
          {fmtTimestamp(msg.createdAt as TimestampInput)}
        </p>
      </div>

      <p className="text-gray-200 mb-4 leading-relaxed text-sm whitespace-pre-wrap">
        {msg.message}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="font-medium text-gray-300 text-sm">Status:</label>
        <select
          value={msg.status}
          onChange={(e) =>
            onStatusChange(msg.userId!, msg.id, e.target.value)
          }
          disabled={updatingId === msg.id || !msg.userId}
          className="bg-white/10 border border-white/20 text-white px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/60 transition-all"
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
          <span className="text-xs text-[#00D1FF] animate-pulse">Updating...</span>
        )}
      </div>
    </div>
  );
}

function TicketColumn({
  title,
  tickets,
  emptyMessage,
  accentClass,
  updatingId,
  onStatusChange,
}: {
  title: string;
  tickets: SupportTicket[];
  emptyMessage: string;
  accentClass: string;
  updatingId: string | null;
  onStatusChange: (userId: string, ticketId: string, status: string) => void;
}) {
  return (
    <section className="flex flex-col min-h-[320px]">
      <div className={`mb-4 pb-3 border-b border-white/10 ${accentClass}`}>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-gray-400 mt-1">{tickets.length} request(s)</p>
      </div>

      <div className="space-y-4 flex-1">
        {tickets.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">{emptyMessage}</p>
        ) : (
          tickets.map((msg) => (
            <TicketCard
              key={msg.id}
              msg={msg}
              updatingId={updatingId}
              onStatusChange={onStatusChange}
            />
          ))
        )}
      </div>
    </section>
  );
}

export default function AdminSupportViewer() {
  const [messages, setMessages] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const response = await getAllUsersSupportMessages();
        setMessages(response.data.tikcets);
      } catch (error: unknown) {
        showErrorToast('Failed to get all users support messages');
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, []);

  const grouped = useMemo(() => {
    const support: SupportTicket[] = [];
    const bugs: SupportTicket[] = [];
    const refunds: SupportTicket[] = [];

    for (const ticket of messages) {
      const type = resolveTicketType(ticket);
      if (type === 'bug') bugs.push(ticket);
      else if (type === 'refund') refunds.push(ticket);
      else support.push(ticket);
    }

    return { support, bugs, refunds };
  }, [messages]);

  const handleStatusChange = async (
    userId: string,
    ticketId: string,
    status: string
  ) => {
    setUpdatingId(ticketId);
    try {
      await updateSupportMessageStatus(userId, ticketId, status);
      setMessages((prev) =>
        prev.map((m) => (m.id === ticketId ? { ...m, status } : m))
      );
    } catch (error: unknown) {
      showErrorToast('Failed to update support message status');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <PageLoadingState
        className="min-h-screen"
        message="Loading support messages..."
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1020] text-white px-4 sm:px-8 py-10">
      <h1 className="text-3xl sm:text-4xl font-extrabold mb-10 text-transparent bg-clip-text bg-linear-to-r from-[#6C5CE7] to-[#00D1FF] text-center">
        Admin — Support Messages
      </h1>

      <div className="grid gap-8 lg:grid-cols-3 max-w-7xl mx-auto">
        <TicketColumn
          title="Support"
          tickets={grouped.support}
          emptyMessage="No support messages."
          accentClass="text-[#00D1FF]"
          updatingId={updatingId}
          onStatusChange={handleStatusChange}
        />
        <TicketColumn
          title="Bug Reports"
          tickets={grouped.bugs}
          emptyMessage="No bug reports."
          accentClass="text-amber-400"
          updatingId={updatingId}
          onStatusChange={handleStatusChange}
        />
        <TicketColumn
          title="Refunds"
          tickets={grouped.refunds}
          emptyMessage="No refund requests."
          accentClass="text-emerald-400"
          updatingId={updatingId}
          onStatusChange={handleStatusChange}
        />
      </div>
    </div>
  );
}
