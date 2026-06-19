'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Spinner } from '@/components/ui/spinner';

export function RecentlyDeletedAccountDialog({
  open,
  onOpenChange,
  onCreateNew,
  onContinueOld,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateNew: () => void | Promise<void>;
  onContinueOld: () => void | Promise<void>;
}) {
  const [recovering, setRecovering] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);
  const busy = recovering || creatingNew;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Account recently deleted</AlertDialogTitle>
          <AlertDialogDescription>
            You recently deleted your account. Do you want to create a new
            account, or continue with the old one?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            variant="outline"
            disabled={busy}
            onClick={async (e) => {
              e.preventDefault();
              setCreatingNew(true);
              try {
                await onCreateNew();
              } finally {
                setCreatingNew(false);
              }
            }}
          >
            {creatingNew ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="size-4" />
                Deleting old account…
              </span>
            ) : (
              'Delete old account'
            )}
          </AlertDialogAction>
          <AlertDialogAction
            variant="default"
            disabled={busy}
            onClick={async (e) => {
              e.preventDefault();
              setRecovering(true);
              try {
                await onContinueOld();
              } finally {
                setRecovering(false);
              }
            }}
          >
            {recovering ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="size-4" />
                Recovering…
              </span>
            ) : (
              'Continue with old one'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
