'use client';

import { useAuth } from '@/src/hooks/useAuth';
import { getTransactions, type UserTransaction } from '@/src/service/api/transactionService';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import Link from 'next/link';

function formatTransactionDate(value: unknown): string {
  if (value == null) return '—';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleString();
  }
  if (typeof value === 'object' && value !== null) {
    const o = value as { _seconds?: number; seconds?: number | string };
    const raw =
      typeof o._seconds === 'number'
        ? o._seconds
        : o.seconds != null
          ? Number(o.seconds)
          : NaN;
    if (Number.isFinite(raw)) return new Date(raw * 1000).toLocaleString();
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString();
  }
  return '—';
}

function transactionTypeLabel(type: string | undefined): string {
  if (type === 'purchase') return 'Credit purchase';
  if (type === 'plan') return 'Plan';
  if (type === 'deduction') return 'Credit usage';
  return type ? type : '—';
}

function formatAmountInr(row: { type?: string; amount?: number }): string {
  if (row.type === 'deduction') return '—';
  if (typeof row.amount === 'number') return `₹${row.amount}`;
  return '—';
}

/** `spendedOn` from the API is usually an app path, e.g. `/instant-generation`. */
function spendOnLinkLabel(path: string): string {
  const trimmed = path.trim();
  if (!trimmed.startsWith('/')) return trimmed;
  const first = trimmed.slice(1).split('/').filter(Boolean)[0] ?? trimmed;
  return first
    .split('-')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}

function SpendOnCell({ spendedOn }: { spendedOn?: string }) {
  const raw = spendedOn?.trim();
  if (!raw) return <span className="text-slate-500">—</span>;
  if (raw.startsWith('/')) {
    return (
      <Link
        href={raw}
        className="font-medium text-indigo-600 hover:underline underline-offset-2"
      >
        {spendOnLinkLabel(raw)}
      </Link>
    );
  }
  return <span className="text-slate-700">{raw}</span>;
}

export default function TransactionsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [listLoading, setListLoading] = useState(true);
  const [transactions, setTransactions] = useState<UserTransaction[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in');
  }, [loading, user, router]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setListLoading(true);
      const res = await getTransactions();
      setTransactions(res.data.transactions ?? []);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load transactions';
      toast.error(message);
      setTransactions([]);
    } finally {
      setListLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user, load]);

  if (loading) return null;
  if (!user) return null;

  if (listLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[240px]">
        <Spinner className="flex items-center justify-center size-6" />
      </div>
    );
  }

  return (
    <div className="max-w-[min(100%,80rem)] w-full mx-auto px-4 sm:px-6 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Transaction history
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Credit top-ups and plan purchases recorded for your account. For
          subscriptions and packs, see{' '}
          <Link
            href="/settings/billings"
            className="font-medium text-indigo-600 hover:underline"
          >
            Billing &amp; Credits
          </Link>
          .
        </p>
      </div>

      <section className="glass-card rounded-3xl p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
          <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
            <Receipt className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Activity</h2>
        </div>

        {transactions.length === 0 ? (
          <p className="text-sm text-slate-600 py-8 text-center">
            No transactions yet. Purchases and top-ups will appear here.
          </p>
        ) : (
          <div className="w-full min-w-0 -mx-1 sm:mx-0">
            <Table className="min-w-4xl w-full table-fixed">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-slate-600 w-[18%]">Date</TableHead>
                  <TableHead className="text-slate-600 w-[12%]">Type</TableHead>
                  <TableHead className="text-slate-600 min-w-0 w-[30%]">
                    Description
                  </TableHead>
                  <TableHead className="text-slate-600 text-right w-[10%]">
                    Amount (INR)
                  </TableHead>
                  <TableHead className="text-slate-600 text-right w-[10%]">
                    Credits
                  </TableHead>
                  <TableHead className="text-slate-600 text-right w-[10%]">
                    Balance after
                  </TableHead>
                  <TableHead className="text-slate-600 text-right w-[10%] min-w-28">
                    Spend on
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((row, index) => (
                  <TableRow key={`${formatTransactionDate(row.createdAt)}-${index}`}>
                    <TableCell className="text-slate-900 tabular-nums align-top whitespace-normal wrap-break-word">
                      {formatTransactionDate(row.createdAt)}
                    </TableCell>
                    <TableCell className="text-slate-700 align-top whitespace-normal wrap-break-word">
                      {transactionTypeLabel(row.type)}
                    </TableCell>
                    <TableCell className="text-slate-700 align-top min-w-0 whitespace-normal wrap-break-word">
                      {row.description ?? '—'}
                    </TableCell>
                    <TableCell className="text-right text-slate-900 tabular-nums align-top">
                      {formatAmountInr(row)}
                    </TableCell>
                    <TableCell className="text-right text-slate-900 tabular-nums align-top">
                      {typeof row.credits === 'number' ? row.credits : '—'}
                    </TableCell>
                    <TableCell className="text-right text-slate-900 tabular-nums align-top">
                      {typeof row.balanceAfter === 'number' ? row.balanceAfter : '—'}
                    </TableCell>
                    <TableCell className="text-right align-top whitespace-normal min-w-0">
                      <SpendOnCell spendedOn={row.spendedOn} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
