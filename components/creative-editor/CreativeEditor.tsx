// EDIT_PHOTO_DISABLED — module preserved for Edit_Photo_V1; not imported on App_Mode.
'use client';

import { useEffect, useRef, useState } from 'react';
import type { CreativeDesignDocument } from '@/lib/creative-design/types';
import { useCreativeEditor } from './useCreativeEditor';
import { TextPropertiesPanel } from './TextPropertiesPanel';
import { EditorToolbar } from './EditorToolbar';
import { saveCreativeDesign } from '@/src/service/api/creativeDesign';
import { toast } from 'sonner';

type CreativeEditorProps = {
  designJson: CreativeDesignDocument;
  platform?: string;
  scheduledPostId?: string;
  caption?: string | null;
  className?: string;
  onSaved?: (payload: { imageUrl: string; designJson: CreativeDesignDocument }) => void;
};

export function CreativeEditor({
  designJson,
  platform,
  scheduledPostId,
  className,
  onSaved,
}: CreativeEditorProps) {
  const [saving, setSaving] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const {
    ready,
    selectedKind,
    activeTextProps,
    fitToContainer,
    exportDesignJson,
    exportPngDataUrl,
    deleteSelected,
    updateActiveText,
  } = useCreativeEditor(designJson, stageRef, viewportRef);

  useEffect(() => {
    if (!ready || !viewportRef.current) return;

    const el = viewportRef.current;
    const applyFit = () => fitToContainer(el.clientWidth, el.clientHeight);

    applyFit();
    const raf = requestAnimationFrame(applyFit);

    const observer = new ResizeObserver(applyFit);
    observer.observe(el);
    window.addEventListener('resize', applyFit);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('resize', applyFit);
    };
  }, [ready, fitToContainer]);

  async function handleSave() {
    const json = exportDesignJson();
    const png = exportPngDataUrl();
    if (!json || !png) {
      toast.error('Could not export creative');
      return;
    }

    if (!scheduledPostId) {
      onSaved?.({ imageUrl: png, designJson: json });
      toast.success('Creative updated');
      return;
    }

    setSaving(true);
    try {
      const result = await saveCreativeDesign({
        designJson: json,
        exportedPngBase64: png,
        scheduledPostId,
        platform,
      });
      toast.success('Creative saved');
      onSaved?.({ imageUrl: result.imageUrl, designJson: result.designJson });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function handleDownload() {
    const png = exportPngDataUrl();
    if (!png) return;
    const a = document.createElement('a');
    a.href = png;
    a.download = `creative-${platform || 'export'}-${Date.now()}.png`;
    a.click();
  }

  return (
    <div className={`flex h-full min-h-0 w-full ${className ?? ''}`}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col p-3 sm:p-4">
        <div
          ref={viewportRef}
          className="flex h-full min-h-0 w-full flex-1 items-center justify-center overflow-hidden rounded-xl border-2 border-slate-300 bg-slate-50"
        >
          <div
            ref={stageRef}
            className={`relative shrink-0 overflow-hidden rounded-sm border border-slate-400 shadow-md ${
              ready ? '' : 'min-h-[200px] min-w-[200px] opacity-40'
            }`}
          />
        </div>
      </div>
      <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l border-slate-200 bg-white p-4 sm:w-80">
        <EditorToolbar
          onSave={handleSave}
          onDownload={handleDownload}
          onDelete={deleteSelected}
          canDelete={selectedKind !== null}
          saving={saving}
        />
        {!scheduledPostId && (
          <p className="text-xs text-slate-500">
            Save applies edits to this session. Download PNG to export locally.
          </p>
        )}
        <TextPropertiesPanel props={activeTextProps} onChange={updateActiveText} />
      </aside>
    </div>
  );
}
