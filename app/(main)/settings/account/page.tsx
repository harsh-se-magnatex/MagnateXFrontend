'use client';

import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { useAuth } from '@/src/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  deleteUserAccount,
  logOutFromAllDevices,
  updateUserName,
} from '@/src/service/api/userService';
import {
  User,
  Lock,
  MonitorSmartphone,
  Trash2,
  ShieldAlert,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  workspaceInputClass,
  workspacePageDescriptionSmClass,
  workspacePageTitleClass,
  workspaceSectionCardClass,
  workspaceSectionTitleLgClass,
  workspaceSectionLabelClass,
  workspaceIconBadgeClass,
} from '@/lib/workspace-ui';
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
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/show-error-toast';
import { updateProfile } from 'firebase/auth';

const inputBase = workspaceInputClass;

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
            className="bg-[var(--red-9)] hover:bg-danger hover:text-white text-white"
          >
            {isDeleting ? 'Deleting...' : 'Delete Account'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function AccountSettingsPage() {
  const { user, loading, accountName, refreshAccountName } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [savedNameTrimmed, setSavedNameTrimmed] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
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
      const persisted = (accountName ?? user.displayName ?? '').trim();
      setSavedNameTrimmed(persisted);
      setName(accountName ?? user.displayName ?? '');
      setResetEmail(user.email || '');
    }
  }, [user, accountName]);

  const nameIsDirty = name.trim() !== savedNameTrimmed;

  const handleConfirmName = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      showErrorToast('Please enter a name.');
      return;
    }
    if (!user) {
      showErrorToast('Not signed in.');
      return;
    }
    setNameSaving(true);
    try {
      const res = await updateUserName(trimmed);
      if (!res.success) {
        showErrorToast('Could not update name. Please try again later.');
        return;
      }
      try {
        await updateProfile(user, { displayName: trimmed });
      } catch (profileErr) {
        console.error(profileErr);
      }
      await refreshAccountName(trimmed);
      setSavedNameTrimmed(trimmed);
      setName(trimmed);
      toast.success(res.message || 'Name updated.');
    } catch (err: unknown) {
      showErrorToast('Could not update name. Please try again later.');
    } finally {
      setNameSaving(false);
    }
  };

  const handleCancelName = () => {
    setName(savedNameTrimmed);
  };

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
      const res = await forgotPassword(resetEmail.trim());
      if (!res.success) {
        setPasswordMessageTone('error');
        setPasswordMessage('Failed to change password.');
        return;
      }
      setPasswordMessageTone('success');
      setPasswordMessage(
        'Password reset link sent. Please check your inbox (and spam folder).'
      );
    } catch (err: unknown) {
      setPasswordMessageTone('error');
      setPasswordMessage('Failed to change password.');
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
      showErrorToast('Failed to log out. Please try again later.');
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
      showErrorToast('Failed to delete account. Please try again later.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (loading) return <PageLoadingState />;
  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className={workspacePageTitleClass}>Account Settings</h1>
        <p className={workspacePageDescriptionSmClass}>
          Manage your account details, security preferences, and active
          sessions.
        </p>
      </div>

      <div className="space-y-8">
        {/* Profile Section */}
        <section className={workspaceSectionCardClass}>
          <div className="mb-6 flex items-center gap-3 border-b border-default pb-4">
            <div className={workspaceIconBadgeClass}>
              <User className="h-5 w-5" />
            </div>
            <h2 className={workspaceSectionTitleLgClass}>
              Profile Information
            </h2>
          </div>

          <div className="grid gap-6 sm:max-w-xl">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="account-name"
                  className={workspaceSectionLabelClass}
                >
                  Full Name
                </label>
                {nameIsDirty && (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-success hover:bg-success hover:text-success"
                      disabled={nameSaving || !name.trim()}
                      aria-label="Save name"
                      onClick={handleConfirmName}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-secondary hover:bg-hover hover:text-default"
                      disabled={nameSaving}
                      aria-label="Discard name changes"
                      onClick={handleCancelName}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <input
                id="account-name"
                type="text"
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
          <section className={workspaceSectionCardClass}>
            <div className="mb-6 flex items-center gap-3 border-b border-default pb-4">
              <div className={workspaceIconBadgeClass}>
                <Lock className="h-5 w-5" />
              </div>
              <h2 className={workspaceSectionTitleLgClass}>Reset Password</h2>
            </div>

            <form
              onSubmit={handleSendResetEmail}
              className="flex max-w-xl flex-col gap-5"
            >
              <p className="text-sm text-secondary">
                We’ll email you a password reset link. For security, we don’t
                show or change your password directly here.
              </p>
              <div className="space-y-2">
                <label
                  htmlFor="reset-email"
                  className={workspaceSectionLabelClass}
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
                      ? 'border-success bg-success text-success'
                      : 'border-primary/30 bg-primary/10 text-default'
                  )}
                >
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>{passwordMessage}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="mt-2 w-fit rounded-full btn-brand-fill px-6 py-2.5 text-sm font-semibold transition-expo disabled:text-quaternary disabled:"
              >
                {saving ? 'Sending email...' : 'Send reset link'}
              </button>
            </form>
          </section>
        )}
        {/* Sessions Section */}
        <section className={workspaceSectionCardClass}>
          <div className="mb-6 flex items-center gap-3 border-b border-default pb-4">
            <div className="rounded-lg bg-element p-2 text-secondary">
              <MonitorSmartphone className="h-5 w-5" />
            </div>
            <h2 className={workspaceSectionTitleLgClass}>Active Sessions</h2>
          </div>

          <p className="mb-6 text-sm text-secondary">
            Sign out on this device and invalidate all other active sessions
            across your devices. You will need to sign in again immediately.
          </p>
          <button
            type="button"
            onClick={handleLogoutAllDevices}
            className="rounded-full border border-default bg-default px-5 py-2.5 text-sm font-semibold text-default hover:bg-hover transition-expo"
          >
            Log out everywhere
          </button>
        </section>

        {/* Danger Zone */}
        <section className="relative overflow-hidden rounded-3xl border border-danger bg-danger p-6 ring-1 ring-[var(--border-danger)] sm:p-8">
          <div className="pointer-events-none absolute top-0 right-0 h-32 w-32 translate-x-1/2/2 rounded-full bg-danger blur-2xl" />

          <div className="mb-6 flex items-center gap-3 border-b border-danger pb-4">
            <div className="rounded-lg bg-danger p-2 text-danger">
              <Trash2 className="h-5 w-5" />
            </div>
            <h2 className="text-section text-default">Danger Zone</h2>
          </div>

          <p className="mb-6 max-w-2xl text-sm text-danger">
            Permanently delete your account and all associated data including
            social integrations, templates, and generated content. This action
            is irreversible.
          </p>
          <button
            type="button"
            onClick={() => setDeleteAccountModalOpen(true)}
            className="rounded-full bg-[var(--red-9)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-danger transition-expo"
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
