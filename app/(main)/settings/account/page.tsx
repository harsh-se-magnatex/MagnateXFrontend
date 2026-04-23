'use client';

import { useAuth } from '@/src/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  deleteUserAccount,
  logOutFromAllDevices,
  logoutUser,
} from '@/src/service/api/userService';
import {
  User,
  Lock,
  MonitorSmartphone,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { forgotPassword, signOutUser } from '@/src/service/auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { LinkCredentialsSection } from './link-credentials';

const inputBase =
  'w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all';

export function DeleteAccountModal({
  open,
  onOpenChange,
  handleDeleteAccount,
  isDeleting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handleDeleteAccount: () => void;
  isDeleting: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            account from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={'destructive'}
            onClick={(e) => {
              e.preventDefault();
              handleDeleteAccount();
            }}
            className="bg-red-600 hover:bg-red-700 hover:text-white text-white"
          >
            {isDeleting ? 'Deleting...' : 'Delete Account'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function AccountSettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordMessageTone, setPasswordMessageTone] = useState<
    'success' | 'error' | ''
  >('');
  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in');
  }, [loading, user, router]);


  useEffect(() => {
    if (user) {
      setName(user.displayName || '');
      setResetEmail(user.email || '');
    }
  }, [user]);

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage('');
    setPasswordMessageTone('');

    if (!resetEmail.trim()) {
      setPasswordMessageTone('error');
      setPasswordMessage('Please enter your email.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(resetEmail.trim())) {
      setPasswordMessageTone('error');
      setPasswordMessage('Please enter a valid email address.');
      return;
    }

    setSaving(true);
    try {
      const res = await forgotPassword(
        resetEmail.trim(),
        `${process.env.NEXT_PUBLIC_APP_URL}/sign-in`
      );
      if (!res.success) {
        setPasswordMessageTone('error');
        setPasswordMessage(res.message || 'Failed to send reset email.');
        return;
      }
      setPasswordMessageTone('success');
      setPasswordMessage(
        'Password reset link sent. Please check your inbox (and spam folder).'
      );
    } catch (err: unknown) {
      setPasswordMessageTone('error');
      setPasswordMessage(
        err instanceof Error ? err.message : 'Failed to change password.'
      );
    } finally {
      setSaving(false);
      setResetEmail('');
    }
  };

  const handleLogoutAllDevices = async () => {
    if (
      !confirm(
        'Log out from all devices? You will need to sign in again on this device.'
      )
    )
      return;
    try {
      await logOutFromAllDevices();
      router.replace('/sign-in');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to log out.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Permanently delete your account? This cannot be undone.'))
      return;
    try {
      setIsDeletingAccount(true);
      await deleteUserAccount();
      await signOutUser();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete account.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (loading) return null;
  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Account Settings
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Manage your account details, security preferences, and active
          sessions.
        </p>
      </div>

      <div className="space-y-8">
        {/* Profile Section */}
        <section className="glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <User className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              Profile Information
            </h2>
          </div>

          <div className="grid gap-6 sm:max-w-xl">
            <div className="space-y-2">
              <label
                htmlFor="account-name"
                className="text-sm font-semibold text-slate-700"
              >
                Full Name
              </label>
              <input
                id="account-name"
                type="text"
                disabled
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputBase}
                placeholder="Your name"
              />
            </div>
          </div>
        </section>

        <LinkCredentialsSection user={user} />

        {user?.providerData.some(
          (provider) => provider.providerId === 'password'
        ) && (
          <section className="glass-card rounded-3xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <Lock className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900">
                Reset Password
              </h2>
            </div>

            <form
              onSubmit={handleSendResetEmail}
              className="flex max-w-xl flex-col gap-5"
            >
              <p className="text-sm text-slate-600">
                We’ll email you a password reset link. For security, we don’t
                show or change your password directly here.
              </p>
              <div className="space-y-2">
                <label
                  htmlFor="reset-email"
                  className="text-sm font-semibold text-slate-700"
                >
                  Email address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className={inputBase}
                  placeholder="your@email.com"
                />
              </div>

              {passwordMessage && (
                <div
                  className={cn(
                    'p-3 rounded-xl text-sm flex items-start gap-2 border',
                    passwordMessageTone === 'success'
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                      : 'bg-indigo-50 border-indigo-100 text-indigo-700'
                  )}
                >
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>{passwordMessage}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="mt-2 w-fit rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-600/20 active:scale-95"
              >
                {saving ? 'Sending email...' : 'Send reset link'}
              </button>
            </form>
          </section>
        )}
        {/* Sessions Section */}
        <section className="glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <MonitorSmartphone className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              Active Sessions
            </h2>
          </div>

          <p className="text-sm text-slate-600 mb-6">
            Sign out on this device and invalidate all other active sessions
            across your devices. You will need to sign in again immediately.
          </p>
          <button
            type="button"
            onClick={handleLogoutAllDevices}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            Log out everywhere
          </button>
        </section>

        {/* Danger Zone */}
        <section className="rounded-3xl border border-red-100 bg-red-50/50 p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />

          <div className="flex items-center gap-3 mb-6 border-b border-red-100 pb-4">
            <div className="p-2 bg-red-100 rounded-lg text-red-600">
              <Trash2 className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-red-700">Danger Zone</h2>
          </div>

          <p className="text-sm text-red-600/80 mb-6 max-w-2xl">
            Permanently delete your account and all associated data including
            social integrations, templates, and generated content. This action
            is irreversible.
          </p>
          <button
            type="button"
            onClick={() => setDeleteAccountModalOpen(true)}
            className="rounded-xl bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-all shadow-md shadow-red-600/20 active:scale-95"
          >
            Delete account permanently
          </button>
        </section>
      </div>
      
      <DeleteAccountModal
        handleDeleteAccount={handleDeleteAccount}
        open={deleteAccountModalOpen}
        onOpenChange={setDeleteAccountModalOpen}
        isDeleting={isDeletingAccount}
      />
    </div>
  );
}
