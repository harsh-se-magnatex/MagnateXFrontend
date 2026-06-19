// EDIT_PHOTO_DISABLED — module preserved for Edit_Photo_V1; not imported on App_Mode.
'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CreativeDesignDocument } from '@/lib/creative-design/types';
import { ensureDesignJsonHasText } from '@/lib/creative-design/ensure-design-text';
import { EditCreativeButton } from '@/components/creative-editor/EditCreativeButton';
import { CreativeEditorModal } from '@/components/creative-editor/CreativeEditorModal';

type GeneratedCreativeActionsProps = {
  designJson?: CreativeDesignDocument | null;
  /** Social caption — used to add a fallback headline text layer when tiers are missing. */
  caption?: string | null;
  platform?: string;
  scheduledPostId?: string;
  onUpdated?: (payload: { imageUrl: string; designJson: CreativeDesignDocument }) => void;
  className?: string;
};

export function GeneratedCreativeActions({
  designJson,
  caption,
  platform,
  scheduledPostId,
  onUpdated,
  className,
}: GeneratedCreativeActionsProps) {
  const [open, setOpen] = useState(false);
  const [localDesign, setLocalDesign] = useState(designJson);

  useEffect(() => {
    setLocalDesign(designJson);
  }, [designJson]);

  const editableDesign = useMemo(() => {
    const base = localDesign ?? designJson;
    if (!base) return undefined;
    return ensureDesignJsonHasText(base, caption);
  }, [localDesign, designJson, caption]);

  return (
    <>
      <EditCreativeButton
        designJson={editableDesign}
        onClick={() => setOpen(true)}
        className={className}
      />
      <CreativeEditorModal
        open={open}
        onClose={() => setOpen(false)}
        designJson={editableDesign}
        platform={platform}
        scheduledPostId={scheduledPostId}
        caption={caption}
        onSaved={(payload) => {
          setLocalDesign(payload.designJson);
          onUpdated?.(payload);
        }}
      />
    </>
  );
}
