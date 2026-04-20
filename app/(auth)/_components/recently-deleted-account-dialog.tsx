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
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
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
            onClick={(e) => {
              e.preventDefault();
              setCreatingNew(true);
              void onCreateNew();
              setCreatingNew(false);
            }}
          >
            {creatingNew ? 'Deleting old account...' : 'Delete old account'}
          </AlertDialogAction>
          <AlertDialogAction
            variant="default"
            onClick={async (e) => {
              e.preventDefault();
              setRecovering(true);
              void onContinueOld();
              setRecovering(false);
            }}
          >
            {recovering ? 'Recovering...' : 'Continue with old one'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
