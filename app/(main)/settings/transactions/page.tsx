'use client';

import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { useAuth } from '@/src/hooks/useAuth';
import { getTransactions, type UserTransaction } from '@/src/service/api/transactionService';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/show-error-toast';
import Link from 'next/link';
import {
  useTimestampFormatter,
  type TimestampInput,
} from '@/lib/user-timezone';

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

function InvoiceCell({ invoiceUrl }: { invoiceUrl?: string }) {
  const raw = invoiceUrl?.trim();
  if (!raw) return <span className="text-slate-500">—</span>;
  return (
    <a
      href={raw}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-indigo-600 hover:underline underline-offset-2"
    >
      View invoice
    </a>
  );
}



export default function TransactionsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const formatTransactionDate = useTimestampFormatter();
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
      showErrorToast('Failed to load transactions');
      setTransactions([]);
    } finally {
      setListLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void load();
  }, [user, load]);

  if (loading) return <PageLoadingState />;
  if (!user) return null;

  if (listLoading) {
    return <PageLoadingState className="min-h-[240px]" />;
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
            <Table
              containerClassName="max-h-80 overflow-y-auto custom-scrollbar w-full min-w-0 -mx-1 px-1 sm:mx-0"
              className="min-w-[880px] w-full table-fixed border-separate border-spacing-0"
            >
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="sticky top-0 z-10 bg-card text-slate-600 w-[16%]">
                    Date
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-card text-slate-600 w-[11%]">
                    Type
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-card text-slate-600 min-w-0 w-[26%]">
                    Description
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-card text-slate-600 text-right w-[9%]">
                    Amount (INR)
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-card text-slate-600 text-right w-[9%]">
                    Credits
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-card text-slate-600 text-right w-[9%]">
                    Balance after
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 bg-card text-slate-600 text-right w-[8%] min-w-28">
                    Invoice
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((row, index) => (
                  <TableRow key={`${formatTransactionDate(row.createdAt as TimestampInput)}-${index}`}>
                    <TableCell className="text-slate-900 tabular-nums align-top whitespace-normal wrap-break-word">
                      {formatTransactionDate(row.createdAt as TimestampInput)}
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
                    <TableCell className="align-top text-right whitespace-normal min-w-0">
                      <InvoiceCell invoiceUrl={row.invoiceUrl} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        )}
      </section>
    </div>
  );
}
