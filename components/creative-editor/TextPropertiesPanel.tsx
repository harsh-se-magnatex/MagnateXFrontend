// EDIT_PHOTO_DISABLED — module preserved for Edit_Photo_V1; not imported on App_Mode.
'use client';

type TextPropertiesPanelProps = {
  props: {
    fill: string;
    fontSize: number;
    fontFamily: string;
    fontWeight: string;
    textAlign: string;
  } | null;
  onChange: (patch: Partial<{ fill: string; fontSize: number; fontFamily: string; fontWeight: string; textAlign: string }>) => void;
};

const FONT_OPTIONS = [
  'Inter',
  'Playfair Display',
  'Oswald',
  'Cormorant Garamond',
  'JetBrains Mono',
  'Lobster',
  'Fredoka',
  'Cinzel',
  'Pinyon Script',
];

export function TextPropertiesPanel({ props, onChange }: TextPropertiesPanelProps) {
  if (!props) {
    return (
      <p className="text-sm text-slate-500">Select a text layer to edit font and color.</p>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      <label className="flex flex-col gap-1">
        <span className="text-slate-600 font-medium">Color</span>
        <input
          type="color"
          value={props.fill.startsWith('#') ? props.fill : '#ffffff'}
          onChange={(e) => onChange({ fill: e.target.value })}
          className="h-9 w-full cursor-pointer rounded border border-slate-200"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-slate-600 font-medium">Font size</span>
        <input
          type="number"
          min={8}
          max={200}
          value={props.fontSize}
          onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
          className="rounded-lg border border-slate-200 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-slate-600 font-medium">Font family</span>
        <select
          value={props.fontFamily}
          onChange={(e) => onChange({ fontFamily: e.target.value })}
          className="rounded-lg border border-slate-200 px-3 py-2"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-slate-600 font-medium">Weight</span>
        <select
          value={props.fontWeight}
          onChange={(e) => onChange({ fontWeight: e.target.value })}
          className="rounded-lg border border-slate-200 px-3 py-2"
        >
          <option value="400">Regular</option>
          <option value="500">Medium</option>
          <option value="700">Bold</option>
          <option value="900">Black</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-slate-600 font-medium">Align</span>
        <select
          value={props.textAlign}
          onChange={(e) => onChange({ textAlign: e.target.value })}
          className="rounded-lg border border-slate-200 px-3 py-2"
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </label>
    </div>
  );
}
