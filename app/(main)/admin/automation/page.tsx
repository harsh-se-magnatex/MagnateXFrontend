'use client';

import Link from 'next/link';
import { PageLoadingState } from '@/components/shared/PageLoadingState';
import {
  getAdminAutomationUnpaidOnboarded,
  type AdminAutomationClient,
  type AdminAutomationDateField,
} from '@/src/service/api/adminService';
import { useUser } from '../../_components/useUser';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { showErrorToast } from '@/lib/show-error-toast';
import { useRouter } from 'next/navigation';
import {
  useTimestampFormatter,
  type TimestampInput,
} from '@/lib/user-timezone';

function defaultFromDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 30);
  return d.toISOString().slice(0, 10);
}

function defaultToDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminAutomationPage() {
  const { user } = useUser();
  const formatDate = useTimestampFormatter();
  const router = useRouter();
  const [clients, setClients] = useState<AdminAutomationClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(defaultFromDate);
  const [to, setTo] = useState(defaultToDate);
  const [dateField, setDateField] =
    useState<AdminAutomationDateField>('createdAt');
  const [search, setSearch] = useState('');
  const [activeFrom, setActiveFrom] = useState(defaultFromDate);
  const [activeTo, setActiveTo] = useState(defaultToDate);
  const [activeDateField, setActiveDateField] =
    useState<AdminAutomationDateField>('createdAt');
  const [activeSearch, setActiveSearch] = useState('');

  const loadClients = async (args: {
    from: string;
    to: string;
    dateField: AdminAutomationDateField;
    search: string;
  }) => {
    setLoading(true);
    try {
      const response = await getAdminAutomationUnpaidOnboarded({
        from: args.from || undefined,
        to: args.to || undefined,
        dateField: args.dateField,
        search: args.search.trim() || undefined,
      });
      setClients(response.data.clients);
      setActiveFrom(args.from);
      setActiveTo(args.to);
      setActiveDateField(args.dateField);
      setActiveSearch(args.search.trim());
    } catch {
      showErrorToast('Failed to fetch automation clients. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && !user.admin) {
      router.replace('/home');
      return;
    }
  }, [router, user]);

  useEffect(() => {
    if (!user?.admin) return;
    loadClients({
      from: defaultFromDate(),
      to: defaultToDate(),
      dateField: 'createdAt',
      search: '',
    });
  }, [user]);

  const summary = useMemo(() => {
    const fieldLabel =
      activeDateField === 'lastLoginAt' ? 'last login' : 'signup';
    const range =
      activeFrom || activeTo
        ? ` (${fieldLabel}: ${activeFrom || '…'} → ${activeTo || '…'})`
        : '';
    const searchPart = activeSearch ? ` matching "${activeSearch}"` : '';
    return `${clients.length} unpaid signup(s)${range}${searchPart}`;
  }, [
    clients.length,
    activeDateField,
    activeFrom,
    activeTo,
    activeSearch,
  ]);

  if (!user?.admin) {
    return null;
  }

  const handleFilter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loadClients({ from, to, dateField, search });
  };

  const handleReset = async () => {
    const nextFrom = defaultFromDate();
    const nextTo = defaultToDate();
    setFrom(nextFrom);
    setTo(nextTo);
    setDateField('createdAt');
    setSearch('');
    await loadClients({
      from: nextFrom,
      to: nextTo,
      dateField: 'createdAt',
      search: '',
    });
  };

  return (
    <div className="min-h-screen bg-[#0B1020] text-white px-6 py-8 md:px-10">
      <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-[#6C5CE7] to-[#00D1FF] mb-2">
        Admin - Automation
      </h1>
      <p className="mb-6 max-w-2xl text-sm text-gray-300">
        Users who signed up but never purchased a plan
        (<code className="text-white/70">activePlan = non-subscribed</code>).
        Onboarding and business details are not required.
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/admin/automation"
          className="rounded-lg bg-[#00D1FF] px-4 py-2 text-sm font-semibold text-[#0B1020]"
        >
          Unpaid signups
        </Link>
        <Link
          href="/admin/automation/landing-leads"
          className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
        >
          Landing first posts
        </Link>
      </div>

      <form
        onSubmit={handleFilter}
        className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5"
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_180px_1fr_120px_110px]">
          <label className="text-xs text-gray-400">
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-white/20 bg-white/10 px-3 text-white focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/60"
            />
          </label>
          <label className="text-xs text-gray-400">
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-white/20 bg-white/10 px-3 text-white focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/60"
            />
          </label>
          <label className="text-xs text-gray-400">
            Date field
            <select
              value={dateField}
              onChange={(e) =>
                setDateField(e.target.value as AdminAutomationDateField)
              }
              className="mt-1 h-11 w-full rounded-lg border border-white/20 bg-white/10 px-3 text-white focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/60"
            >
              <option value="createdAt" className="text-black">
                Signup date
              </option>
              <option value="lastLoginAt" className="text-black">
                Last login
              </option>
            </select>
          </label>
          <label className="text-xs text-gray-400">
            Search
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, business, user ID…"
              className="mt-1 h-11 w-full rounded-lg border border-white/20 bg-white/10 px-3 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/60"
            />
          </label>
          <button
            type="submit"
            className="h-11 self-end rounded-lg bg-[#00D1FF] px-5 font-semibold text-[#0B1020] hover:bg-[#32dbff] transition-colors"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="h-11 self-end rounded-lg border border-white/30 px-4 font-semibold text-white hover:bg-white/10 transition-colors"
          >
            Reset
          </button>
        </div>
      </form>

      <div className="mb-4 text-sm text-gray-300">{summary}.</div>

      {loading ? (
        <PageLoadingState
          className="min-h-[240px]"
          message="Loading automation clients..."
        />
      ) : clients.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-300">
          No matching clients in this date range.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
          <table className="min-w-full text-sm">
            <thead className="bg-white/10 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Business</th>
                <th className="px-4 py-3 font-semibold">Industry</th>
                <th className="px-4 py-3 font-semibold">Website</th>
                <th className="px-4 py-3 font-semibold">User ID</th>
                <th className="px-4 py-3 font-semibold">Signup</th>
                <th className="px-4 py-3 font-semibold">Last login</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr
                  key={client.userId}
                  className="border-t border-white/10 align-top"
                >
                  <td className="px-4 py-3">{client.name}</td>
                  <td className="px-4 py-3">{client.email}</td>
                  <td className="px-4 py-3">
                    <div>{client.businessName}</div>
                    {client.location && client.location !== '—' ? (
                      <div className="mt-1 text-xs text-gray-400">
                        {client.location}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{client.industry}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate">
                    {client.website !== '—' ? (
                      <a
                        href={
                          client.website.startsWith('http')
                            ? client.website
                            : `https://${client.website}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#00D1FF] hover:underline"
                      >
                        {client.website}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{client.userId}</td>
                  <td className="px-4 py-3">
                    {formatDate(client.createdAt as TimestampInput)}
                  </td>
                  <td className="px-4 py-3">
                    {formatDate(client.lastLoginAt as TimestampInput)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
