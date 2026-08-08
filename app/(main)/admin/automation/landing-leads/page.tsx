'use client';

import Link from 'next/link';
import { PageLoadingState } from '@/components/shared/PageLoadingState';
import {
  getAdminLandingLeadMagnetLeads,
  type AdminLandingLead,
} from '@/src/service/api/adminService';
import { useUser } from '../../../_components/useUser';
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

function AutomationTabs({ active }: { active: 'unpaid' | 'landing' }) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      <Link
        href="/admin/automation"
        className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
          active === 'unpaid'
            ? 'bg-[#00D1FF] text-[#0B1020]'
            : 'border border-white/20 text-white/80 hover:bg-white/10'
        }`}
      >
        Unpaid signups
      </Link>
      <Link
        href="/admin/automation/landing-leads"
        className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
          active === 'landing'
            ? 'bg-[#00D1FF] text-[#0B1020]'
            : 'border border-white/20 text-white/80 hover:bg-white/10'
        }`}
      >
        Landing first posts
      </Link>
    </div>
  );
}

export default function AdminLandingLeadsPage() {
  const { user } = useUser();
  const formatDate = useTimestampFormatter();
  const router = useRouter();
  const [leads, setLeads] = useState<AdminLandingLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(defaultFromDate);
  const [to, setTo] = useState(defaultToDate);
  const [search, setSearch] = useState('');
  const [activeFrom, setActiveFrom] = useState(defaultFromDate);
  const [activeTo, setActiveTo] = useState(defaultToDate);
  const [activeSearch, setActiveSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadLeads = async (args: {
    from: string;
    to: string;
    search: string;
  }) => {
    setLoading(true);
    try {
      const response = await getAdminLandingLeadMagnetLeads({
        from: args.from || undefined,
        to: args.to || undefined,
        search: args.search.trim() || undefined,
      });
      setLeads(response.data.leads);
      setActiveFrom(args.from);
      setActiveTo(args.to);
      setActiveSearch(args.search.trim());
    } catch {
      showErrorToast('Failed to fetch landing leads. Please try again.');
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
    loadLeads({
      from: defaultFromDate(),
      to: defaultToDate(),
      search: '',
    });
  }, [user]);

  const summary = useMemo(() => {
    const range =
      activeFrom || activeTo
        ? ` (${activeFrom || '…'} → ${activeTo || '…'})`
        : '';
    const searchPart = activeSearch ? ` matching "${activeSearch}"` : '';
    return `${leads.length} landing lead(s)${range}${searchPart}`;
  }, [leads.length, activeFrom, activeTo, activeSearch]);

  if (!user?.admin) {
    return null;
  }

  const handleFilter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loadLeads({ from, to, search });
  };

  const handleReset = async () => {
    const nextFrom = defaultFromDate();
    const nextTo = defaultToDate();
    setFrom(nextFrom);
    setTo(nextTo);
    setSearch('');
    await loadLeads({ from: nextFrom, to: nextTo, search: '' });
  };

  return (
    <div className="min-h-screen bg-[#0B1020] text-white px-6 py-8 md:px-10">
      <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-[#6C5CE7] to-[#00D1FF] mb-2">
        Admin - Landing first posts
      </h1>
      <p className="mb-6 max-w-2xl text-sm text-gray-300">
        People who entered their email on the landing page and generated a free
        sample post (marketing leads).
      </p>

      <AutomationTabs active="landing" />

      <form
        onSubmit={handleFilter}
        className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5"
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_120px_110px]">
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
            Search
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Email, domain, business…"
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
          message="Loading landing leads..."
        />
      ) : leads.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-300">
          No landing leads in this date range.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
          <table className="min-w-full text-sm">
            <thead className="bg-white/10 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Business</th>
                <th className="px-4 py-3 font-semibold">Website</th>
                <th className="px-4 py-3 font-semibold">Platform</th>
                <th className="px-4 py-3 font-semibold">Post</th>
                <th className="px-4 py-3 font-semibold">Claimed</th>
                <th className="px-4 py-3 font-semibold">Preview</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const open = expandedId === lead.id;
                return (
                  <tr
                    key={lead.id}
                    className="border-t border-white/10 align-top"
                  >
                    <td className="px-4 py-3">{lead.email}</td>
                    <td className="px-4 py-3">
                      <div>{lead.businessName}</div>
                      {lead.industry !== '—' ? (
                        <div className="mt-1 text-xs text-gray-400">
                          {lead.industry}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 max-w-[180px] truncate">
                      {lead.website !== '—' ? (
                        <a
                          href={
                            lead.website.startsWith('http')
                              ? lead.website
                              : `https://${lead.website}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#00D1FF] hover:underline"
                        >
                          {lead.domainKey || lead.website}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 capitalize">{lead.platform}</td>
                    <td className="px-4 py-3">
                      {lead.postStatus === 'ready' ? (
                        <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-emerald-200">
                          Ready
                        </span>
                      ) : lead.postStatus === 'generating' ? (
                        <span className="rounded-full bg-amber-500/20 px-2.5 py-1 text-amber-200">
                          Generating
                        </span>
                      ) : lead.postStatus === 'failed' ? (
                        <span className="rounded-full bg-red-500/20 px-2.5 py-1 text-red-200">
                          Failed
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-gray-300">
                          {lead.postStatus || 'None'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(lead.createdAt as TimestampInput)}
                    </td>
                    <td className="px-4 py-3">
                      {lead.postStatus === 'ready' ? (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(open ? null : lead.id)
                          }
                          className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold hover:bg-white/10"
                        >
                          {open ? 'Hide' : 'View'}
                        </button>
                      ) : (
                        '—'
                      )}
                      {open ? (
                        <div className="mt-3 max-w-sm space-y-2 rounded-xl border border-white/10 bg-black/30 p-3">
                          {lead.postImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={lead.postImageUrl}
                              alt=""
                              className="max-h-64 w-full rounded-lg object-contain"
                            />
                          ) : null}
                          <p className="whitespace-pre-wrap text-xs leading-relaxed text-white/75">
                            {lead.postCaption || 'No caption'}
                          </p>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
