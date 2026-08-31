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
      showErrorToast('Failed to fetch users. Please try again later.');
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
      showErrorToast('Failed to update freeze status. Please try again later.');
    } finally {
      setActionUserId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1020] text-white px-6 py-8 md:px-10">
      <h1 className="text-page-title text-default mb-8">
        Admin - User Management
      </h1>

      <form
        onSubmit={handleSearch}
        className="mb-6 rounded-2xl border border-white/10 bg-default p-4 md:p-5"
      >
        <div className="grid gap-3 md:grid-cols-[1fr_220px_140px_110px]">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by name, user ID, or subscription ID"
            className="h-11 rounded-lg border border-white/20 bg-default px-3 text-white placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/60"
          />
          <select
            value={searchField}
            onChange={(e) =>
              setSearchField(e.target.value as AdminUserSearchField)
            }
            className="h-11 rounded-lg border border-white/20 bg-default px-3 text-white focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/60"
          >
            {SEARCH_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
                className="text-default"
              >
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-11 rounded-full bg-[#00D1FF] px-5 font-semibold text-[#0B1020] hover:bg-[#32dbff] transition-expo"
          >
            Search
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="h-11 rounded-full border border-white/30 px-4 font-semibold text-white hover:bg-default transition-expo"
          >
            Reset
          </button>
        </div>
      </form>

      <div className="mb-4 text-sm text-tertiary">
        Showing {users.length} user(s)
        {activeSearchText
          ? ` for "${activeSearchText}" in ${activeSearchField}`
          : ''}
        .
      </div>

      {loading ? (
        <PageLoadingState
          className="min-h-[240px]"
          message="Loading users..."
        />
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-default p-8 text-center text-tertiary">
          No users found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-default">
          <table className="min-w-full text-sm">
            <thead className="bg-default text-left">
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
                <tr
                  key={user.userId}
                  className="border-t border-white/10 align-top"
                >
                  <td className="px-4 py-3">{user.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{user.userId}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {user.subscriptionId || '—'}
                  </td>
                  <td className="px-4 py-3">{user.activePlan}</td>
                  <td className="px-4 py-3">
                    {user.isAccountFrozen ? (
                      <span className="rounded-full bg-danger px-2.5 py-1 text-danger">
                        Frozen
                      </span>
                    ) : (
                      <span className="rounded-full bg-success px-2.5 py-1 text-success">
                        Active
                      </span>
                    )}
                    {user.subscriptionStatus ? (
                      <div className="mt-1 text-xs text-tertiary">
                        Sub: {user.subscriptionStatus}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {formatDate(user.createdAt as TimestampInput)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleFreezeToggle(user)}
                      disabled={actionUserId === user.userId}
                      className={`rounded-full px-3 py-2 font-semibold transition-expo disabled:text-quaternary disabled:cursor-not-allowed ${
                        user.isAccountFrozen
                          ? 'bg-[var(--green-9)] text-white hover:bg-success'
                          : 'bg-[var(--red-9)] text-white hover:bg-danger'
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
