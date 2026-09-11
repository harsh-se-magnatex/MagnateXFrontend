'use client';
import { useEffect, useState } from 'react';
import { getReferencePreview, type TemplateDesign, type DesignFinding, type CompatibleVisualConfiguration } from '@/src/service/api/template-dna.service';

const inputClass = 'mt-1 w-full rounded-lg border border-default bg-element p-2 text-sm text-default';
const label = (key: string) => key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
const numeric = new Set(['fontSize', 'weight', 'lineHeight', 'letterSpacing', 'maxLines', 'padding', 'coverage', 'margin', 'whitespace', 'borderWidth', 'cornerRadius', 'clearSpace', 'x', 'y', 'width', 'height', 'position']);
const emptyBox = { x: 0, y: 0, width: 0.5, height: 0.2 };

export function ReferenceThumbnail({ platform, id }: { platform: string; id: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let cancelled = false; let objectUrl = '';
    void getReferencePreview(platform, id).then(blob => { if (!cancelled) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); } }).catch(() => {});
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [platform, id]);
  return url ? <img src={url} alt="Uploaded style reference" className="h-full w-full rounded-lg object-contain" /> : <span className="text-xs text-secondary">Reference preview unavailable</span>;
}

function ValueEditor({ name, value, onChange }: { name: string; value: unknown; onChange: (value: unknown) => void }) {
  if (Array.isArray(value)) return <div className="space-y-2">{value.map((item, i) => <div key={i} className="flex items-start gap-2"><div className="min-w-0 flex-1"><ValueEditor name={name === 'colors' ? 'color' : name} value={item} onChange={next => onChange(value.map((old, j) => i === j ? next : old))}/></div><button type="button" aria-label={`Remove ${name} ${i + 1}`} onClick={() => onChange(value.filter((_, j) => i !== j))}>×</button></div>)}<button type="button" className="text-xs text-secondary underline" onClick={() => onChange([...value, name === 'gradientStops' ? { color: '#ffffff', position: 0 } : '#ffffff'])}>Add {label(name)}</button></div>;
  if (value && typeof value === 'object') return <div className="grid grid-cols-2 gap-2">{Object.entries(value).map(([key, item]) => <label key={key} className="text-xs text-secondary">{label(key)}<ValueEditor name={key} value={item} onChange={next => onChange({ ...value, [key]: next })}/></label>)}</div>;
  if (value === null && /box$/i.test(name)) return <button type="button" className="text-xs underline" onClick={() => onChange(emptyBox)}>Set placement (0–1)</button>;
  if (value === null && (name === 'colors' || name === 'gradientStops')) return <button type="button" className="text-xs underline" onClick={() => onChange([])}>Set {label(name)}</button>;
  if (numeric.has(name) || typeof value === 'number') return <input aria-label={label(name)} className={inputClass} type="number" step={name === 'weight' || name === 'maxLines' ? 1 : 0.001} placeholder="Unknown" value={value === null ? '' : String(value)} onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}/>;
  if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) return <div className="flex items-center gap-2"><input aria-label={`${label(name)} swatch`} type="color" value={value} onChange={e => onChange(e.target.value)} className="h-9 w-10 shrink-0"/><input aria-label={label(name)} className={inputClass} value={value} onChange={e => onChange(e.target.value)}/></div>;
  return <input aria-label={label(name)} className={inputClass} placeholder="Unknown / not observed" value={value === null ? '' : String(value ?? '')} onChange={e => onChange(e.target.value || null)}/>;
}

function DesignNode({ name, node, onChange, platform, canvasHeight }: { name: string; node: unknown; onChange: (next: unknown) => void; platform: string; canvasHeight: number }) {
  if (!node || typeof node !== 'object') return <ValueEditor name={name} value={node} onChange={onChange}/>;
  if ('value' in node) {
    const finding = node as DesignFinding;
    return <div className="min-w-0 rounded-xl border border-default p-3"><p className="text-sm font-medium text-default">{label(name)}{name === 'fontSize' ? ' · fraction of height' : ''}</p>
      <ValueEditor name={name} value={finding.value} onChange={value => onChange({ ...finding, value, state: value === null ? 'not_observed' : 'observed', observedRange: null })}/>
      {name === 'fontSize' && typeof finding.value === 'number' && <p className="mt-1 text-xs text-secondary">≈ {Math.round(finding.value * canvasHeight)} px on this canvas (estimate)</p>}
      <p className="mt-2 text-xs text-secondary">{finding.state.replaceAll('_', ' ')} · {finding.confidence} confidence{finding.observedRange ? ` · range ${finding.observedRange.min}–${finding.observedRange.max}` : ''}</p>
      {!!finding.evidenceImageIds.length && <details className="mt-1 text-xs text-secondary"><summary>Reference evidence ({finding.evidenceImageIds.length})</summary><div className="mt-2 flex flex-wrap gap-1">{finding.evidenceImageIds.map(id => <div key={id} className="h-14 w-14"><ReferenceThumbnail platform={platform} id={id}/></div>)}</div></details>}
    </div>;
  }
  if (Array.isArray(node)) return <div className="space-y-3">{node.map((item, i) => <div key={i} className="rounded-xl border border-default p-3"><DesignNode name={`${name} ${i + 1}`} node={item} onChange={next => onChange(node.map((old, j) => i === j ? next : old))} platform={platform} canvasHeight={canvasHeight}/><button type="button" className="mt-2 text-xs underline" onClick={() => onChange(node.filter((_, j) => i !== j))}>Remove {label(name)}</button></div>)}{!node.length && <p className="text-sm text-secondary">Not observed</p>}</div>;
  return <div className="grid gap-3 sm:grid-cols-2">{Object.entries(node).map(([key, value]) => <div key={key} className={value && typeof value === 'object' && !('value' in value) ? 'sm:col-span-2' : ''}>{value && typeof value === 'object' && !('value' in value) && <h4 className="mb-2 font-medium text-default">{label(key)}</h4>}<DesignNode name={key} node={value} onChange={next => onChange({ ...node, [key]: next })} platform={platform} canvasHeight={canvasHeight}/></div>)}</div>;
}

export function TemplateDesignEditor({ design, onChange, platform }: { design: TemplateDesign; onChange: (design: TemplateDesign) => void; platform: string }) {
  const [height, setHeight] = useState(1350);
  const background = design.colors.find((c: any) => c.role === 'background')?.hex.value ?? '#eeeeee';
  const accent = design.colors.find((c: any) => c.role === 'accent' || c.role === 'primary')?.hex.value ?? '#7c3aed';
  const textColor = design.colors.find((c: any) => c.role === 'text' || c.role === 'foreground')?.hex.value ?? '#20202a';
  return <div className="space-y-4"><div className="flex items-end justify-between gap-3"><div><p className="text-sm font-semibold text-default">Visual preview</p><p className="mt-1 text-xs text-secondary">A quick wireframe of the measured hierarchy and safe zones.</p></div><label className="w-40 text-xs text-secondary">Canvas<select className={inputClass} value={height} onChange={e => setHeight(Number(e.target.value))}><option value={1080}>Square · 1:1</option><option value={1350}>Portrait · 4:5</option><option value={1920}>Story · 9:16</option></select></label></div>
    <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-default shadow-lg" style={{ aspectRatio: `1080 / ${height}`, background, containerType: 'inline-size' }}>
      <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: accent }} /><div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at 85% 12%, ${accent}, transparent 35%)` }} />
      {design.composition.subjectBox.value && <div className="absolute flex items-center justify-center rounded-xl border border-dashed" style={{ ...boxStyle(design.composition.subjectBox.value), borderColor: accent, backgroundColor: `${accent}18`, color: textColor }}><span className="rounded bg-card/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider">Subject area</span></div>}
      {(['headline', 'body', 'cta'] as const).map(role => { const t = design.typography[role]; const box = t.box.value; const sample = role === 'headline' ? 'Your headline' : role === 'body' ? 'Supporting message' : 'Learn more'; return box ? <div key={role} className="absolute overflow-hidden px-1" style={{ ...boxStyle(box), color: t.color.value ?? textColor, fontWeight: t.weight.value ?? 400, fontSize: `${Math.max((t.fontSize.value ?? 0.025) * height / 1080 * 100, 1.2)}cqw`, lineHeight: t.lineHeight.value ?? 1.2, textAlign: t.alignment.value === 'center' ? 'center' : t.alignment.value === 'right' ? 'right' : 'left' }}>{sample}</div> : null; })}
    </div><p className="text-center text-xs text-secondary">Illustrative only · measured placement, hierarchy, and color roles</p><div className="flex flex-wrap items-center justify-center gap-2">{design.colors.slice(0, 5).map((c: any, i: number) => <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-default bg-element px-2.5 py-1 text-[11px] text-secondary"><span className="size-3 rounded-full border border-black/10" style={{ background: c.hex?.value ?? '#ddd' }} />{c.role ?? 'Color'}</span>)}</div>
    <div className="space-y-3">{Object.entries(design).map(([key, node]) => <details key={key} open={key === 'typography' || key === 'colors'} className="rounded-2xl border border-default bg-element p-4"><summary className="cursor-pointer font-semibold text-default">{label(key)}<span className="ml-2 text-xs font-normal text-secondary">Edit measured values</span></summary><div className="mt-4"><DesignNode name={key} node={node} onChange={next => onChange({ ...design, [key]: next })} platform={platform} canvasHeight={height}/></div></details>)}</div>
  </div>;
}

export function CompatibleVisualConfigurationEditor({ configuration, onChange }: { configuration: CompatibleVisualConfiguration; onChange: (configuration: CompatibleVisualConfiguration) => void }) {
  const [text, setText] = useState(() => JSON.stringify(configuration, null, 2));
  const [error, setError] = useState('');
  useEffect(() => { setText(JSON.stringify(configuration, null, 2)); setError(''); }, [configuration]);
  function update(next: string) {
    setText(next);
    try {
      const parsed = JSON.parse(next) as CompatibleVisualConfiguration;
      if (!parsed || typeof parsed !== 'object' || !parsed.schema || typeof parsed.imageModifiers !== 'string' || typeof parsed.imageAvoid !== 'string') throw new Error('JSON must contain schema, imageModifiers, and imageAvoid.');
      setError('');
      onChange(parsed);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : 'Invalid JSON.');
    }
  }
  return <div className="space-y-3">
    <div><h3 className="text-lg font-semibold text-default">Visual configuration JSON</h3><p className="mt-1 text-sm text-secondary">This is the captured How It Looks JSON, shown and edited without converting it into a separate measured schema. Caption settings remain unchanged.</p></div>
    <textarea aria-label="Template DNA visual configuration JSON" spellCheck={false} className="min-h-[32rem] w-full rounded-xl border border-default bg-element p-4 font-mono text-xs leading-5 text-default" value={text} onChange={event => update(event.target.value)} />
    {error && <p className="text-sm text-red-600">{error}</p>}
    <p className="text-xs text-secondary">The server validates the exact preset keys, value types, and array structure when you save.</p>
  </div>;
}
function boxStyle(box: { x: number; y: number; width: number; height: number }) { return { left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.width * 100}%`, height: `${box.height * 100}%` }; }
