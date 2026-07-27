'use client';

import { PageLoadingState } from '@/components/shared/PageLoadingState';
import {
  getAdminUsers,
  updateAdminUserFreezeStatus,
  type AdminUser,
  type AdminUserSearchField,
} from '@/src/service/api/adminService';
import { useUser } from '../../_components/useUser';
import { FormEvent, useEffect, useState } from 'react';
import { showErrorToast } from '@/lib/show-error-toast';
import { useRouter } from 'next/navigation';
import {
  useTimestampFormatter,
  type TimestampInput,
} from '@/lib/user-timezone';

const SEARCH_OPTIONS: Array<{ label: string; value: AdminUserSearchField }> = [
  { label: 'All fields', value: 'all' },
  { label: 'Name', value: 'name' },
  { label: 'User ID', value: 'userId' },
  { label: 'Subscription ID', value: 'subscriptionId' },
];

export default function AdminUsersPage() {
  const { user } = useUser();
  const formatDate = useTimestampFormatter();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [searchField, setSearchField] = useState<AdminUserSearchField>('all');
  const [activeSearchText, setActiveSearchText] = useState('');
  const [activeSearchField, setActiveSearchField] =
    useState<AdminUserSearchField>('all');

  const loadUsers = async (search: string, field: AdminUserSearchField) => {
    setLoading(true);
    try {
      const response = await getAdminUsers(search, field);
      setUsers(response.data.users);
      setActiveSearchText(search);
      setActiveSearchField(field);
    } catch (error: unknown) {
      showErrorToast('Failed to fetch users');
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
    loadUsers('', 'all');
  }, [user]);

  if (!user?.admin) {
    return null;
  }

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loadUsers(searchText.trim(), searchField);
  };

  const handleReset = async () => {
    setSearchText('');
    setSearchField('all');
    await loadUsers('', 'all');
  };

  const handleFreezeToggle = async (user: AdminUser) => {
    const nextFreeze = !user.isAccountFrozen;
    const confirmed = window.confirm(
      nextFreeze
        ? `Freeze account for ${user.name} (${user.userId})?`
        : `Unfreeze account for ${user.name} (${user.userId})?`
    );
    if (!confirmed) return;

    setActionUserId(user.userId);
    try {
      await updateAdminUserFreezeStatus(user.userId, nextFreeze);
      setUsers((prev) =>
        prev.map((item) =>
          item.userId === user.userId
            ? { ...item, isAccountFrozen: nextFreeze }
            : item
        )
      );
    } catch {
      showErrorToast('Failed to update freeze status');
    } finally {
      setActionUserId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1020] text-white px-6 py-8 md:px-10">
      <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-[#6C5CE7] to-[#00D1FF] mb-8">
        Admin - User Management
      </h1>

      <form
        onSubmit={handleSearch}
        className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5"
      >
        <div className="grid gap-3 md:grid-cols-[1fr_220px_140px_110px]">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by name, user ID, or subscription ID"
            className="h-11 rounded-lg border border-white/20 bg-white/10 px-3 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/60"
          />
          <select
            value={searchField}
            onChange={(e) => setSearchField(e.target.value as AdminUserSearchField)}
            className="h-11 rounded-lg border border-white/20 bg-white/10 px-3 text-white focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/60"
          >
            {SEARCH_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="text-black">
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-11 rounded-lg bg-[#00D1FF] px-5 font-semibold text-[#0B1020] hover:bg-[#32dbff] transition-colors"
          >
            Search
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="h-11 rounded-lg border border-white/30 px-4 font-semibold text-white hover:bg-white/10 transition-colors"
          >
            Reset
          </button>
        </div>
      </form>

      <div className="mb-4 text-sm text-gray-300">
        Showing {users.length} user(s)
        {activeSearchText
          ? ` for "${activeSearchText}" in ${activeSearchField}`
          : ''}.
      </div>

      {loading ? (
        <PageLoadingState
          className="min-h-[240px]"
          message="Loading users..."
        />
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-300">
          No users found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
          <table className="min-w-full text-sm">
            <thead className="bg-white/10 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">User ID</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Subscription ID</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.userId} className="border-t border-white/10 align-top">
                  <td className="px-4 py-3">{user.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{user.userId}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {user.subscriptionId || '—'}
                  </td>
                  <td className="px-4 py-3">{user.activePlan}</td>
                  <td className="px-4 py-3">
                    {user.isAccountFrozen ? (
                      <span className="rounded-full bg-red-500/20 px-2.5 py-1 text-red-200">
                        Frozen
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-emerald-200">
                        Active
                      </span>
                    )}
                    {user.subscriptionStatus ? (
                      <div className="mt-1 text-xs text-gray-400">
                        Sub: {user.subscriptionStatus}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{formatDate(user.createdAt as TimestampInput)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleFreezeToggle(user)}
                      disabled={actionUserId === user.userId}
                      className={`rounded-lg px-3 py-2 font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${user.isAccountFrozen
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                        : 'bg-red-500 text-white hover:bg-red-600'
                        }`}
                    >
                      {actionUserId === user.userId
                        ? 'Updating...'
                        : user.isAccountFrozen
                          ? 'Unfreeze'
                          : 'Freeze'}
                    </button>
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
