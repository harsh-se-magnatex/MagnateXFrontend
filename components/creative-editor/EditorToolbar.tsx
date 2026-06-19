// EDIT_PHOTO_DISABLED — module preserved for Edit_Photo_V1; not imported on App_Mode.
'use client';

import { Download, Save, Trash2 } from 'lucide-react';

type EditorToolbarProps = {
  onSave?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  saving?: boolean;
  canDelete?: boolean;
};

export function EditorToolbar({
  onSave,
  onDownload,
  onDelete,
  saving,
  canDelete,
}: EditorToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {onSave && (
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save'}
        </button>
      )}
      {onDownload && (
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          Download PNG
        </button>
      )}
      {onDelete && canDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
        >
          <Trash2 className="h-4 w-4" />
          Delete selected
        </button>
      )}
    </div>
  );
}
