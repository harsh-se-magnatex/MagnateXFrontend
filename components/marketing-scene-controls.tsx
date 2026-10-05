'use client';

import catalog from '@/lib/marketing-scenes.json';
import { workspaceInputClass } from '@/lib/workspace-ui';

export type MarketingSceneSelection = {
  topic: string;
  values: Record<string, string>;
};

export function defaultMarketingScene(
  topicId = 'billboard'
): MarketingSceneSelection {
  const topic =
    catalog.topics.find((entry) => entry.id === topicId) ?? catalog.topics[0];
  return {
    topic: topic.id,
    values: Object.fromEntries(
      [...catalog.global, ...topic.axes].map((axis) => [axis.id, axis.default])
    ),
  };
}

export function MarketingSceneControls({
  scene,
  onSceneChange,
  disabled,
  hasImage,
  showScenes = true,
  requireScene = false,
}: {
  scene?: MarketingSceneSelection;
  onSceneChange?: (scene: MarketingSceneSelection | undefined) => void;
  disabled: boolean;
  hasImage: boolean;
  showScenes?: boolean;
  requireScene?: boolean;
}) {
  const topic = catalog.topics.find((entry) => entry.id === scene?.topic);
  const renderAxes = (axes: typeof catalog.global) => (
    <div className="grid gap-3 sm:grid-cols-2">
      {axes.map((axis) => (
        <label key={axis.id} className="block text-sm text-default">
          <span className="mb-1.5 block font-medium">{axis.label}</span>
          <select
            className={workspaceInputClass}
            value={scene?.values[axis.id] ?? axis.default}
            disabled={disabled}
            onChange={(event) =>
              scene &&
              onSceneChange?.({
                ...scene,
                values: { ...scene.values, [axis.id]: event.target.value },
              })
            }
          >
            {axis.values.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
  return (
    <div className="space-y-4 rounded-xl border border-default p-4">
      {showScenes && (
        <label className="block text-sm text-default">
          <span className="mb-1.5 block font-semibold">Marketing scene</span>
          <select
            className={workspaceInputClass}
            value={scene?.topic ?? ''}
            disabled={disabled}
            onChange={(event) => {
              const selected = catalog.topics.find(
                (entry) => entry.id === event.target.value
              );
              onSceneChange?.(
                selected
                  ? {
                      topic: selected.id,
                      values: Object.fromEntries(
                        [...catalog.global, ...selected.axes].map((axis) => [
                          axis.id,
                          scene?.values[axis.id] &&
                          catalog.global.some((global) => global.id === axis.id)
                            ? scene.values[axis.id]
                            : axis.default,
                        ])
                      ),
                    }
                  : undefined
              );
            }}
          >
            {!requireScene && <option value="">Standard post</option>}
            {catalog.topics.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {topic && (
        <>
          <p
            className={`text-xs ${hasImage ? 'text-secondary' : 'text-warning'}`}
          >
            {hasImage
              ? 'Your uploaded artwork or product will appear in this scene. Add any extra direction below.'
              : 'Upload a product photo or finished artwork to generate this scene.'}
          </p>
          {renderAxes(topic.axes)}
          <details>
            <summary className="cursor-pointer text-sm font-medium text-default">
              Lighting, atmosphere & camera
            </summary>
            <div className="mt-3">{renderAxes(catalog.global)}</div>
            <p className="mt-2 text-xs text-secondary">
              Indian metro is the default region. Scene-specific camera and time
              settings take priority.
            </p>
          </details>
        </>
      )}
    </div>
  );
}
