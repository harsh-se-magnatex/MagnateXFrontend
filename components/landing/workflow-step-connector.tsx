'use client';

import { useCallback, useLayoutEffect, useState } from 'react';

type Point = { x: number; y: number };

function groupCentersByRow(centers: Point[]): Point[][] {
  if (centers.length === 0) return [];

  const rows: Point[][] = [[centers[0]]];
  let rowY = centers[0].y;

  for (let i = 1; i < centers.length; i++) {
    const point = centers[i];
    if (Math.abs(point.y - rowY) > 24) {
      rows.push([point]);
      rowY = point.y;
    } else {
      rows[rows.length - 1].push(point);
    }
  }

  return rows;
}

function buildSerpentinePath(rows: Point[][]): string {
  if (rows.length === 0) return '';

  let path = `M ${rows[0][0].x} ${rows[0][0].y}`;
  const bulge = 32;

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      if (rowIndex === 0 && colIndex === 0) continue;

      const point = row[colIndex];

      if (colIndex === 0) {
        const prevRowLast = rows[rowIndex - 1][rows[rowIndex - 1].length - 1];
        const rightX = Math.max(prevRowLast.x, point.x) + bulge;
        const midY = (prevRowLast.y + point.y) / 2;
        path += ` C ${rightX} ${prevRowLast.y}, ${rightX} ${midY}, ${rightX} ${midY}`;
        path += ` S ${rightX} ${point.y}, ${point.x} ${point.y}`;
      } else {
        path += ` L ${point.x} ${point.y}`;
      }
    }
  }

  return path;
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function collectMidpoints(rows: Point[][]): Point[] {
  const points: Point[] = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      if (colIndex > 0) {
        points.push(midpoint(row[colIndex - 1], row[colIndex]));
      } else if (rowIndex > 0) {
        const prevRowLast = rows[rowIndex - 1][rows[rowIndex - 1].length - 1];
        points.push(midpoint(prevRowLast, row[colIndex]));
      }
    }
  }

  return points;
}

export function WorkflowStepConnector({
  stepCount,
}: {
  stepCount: number;
}) {
  const [pathD, setPathD] = useState('');
  const [diamonds, setDiamonds] = useState<Point[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const updatePath = useCallback(() => {
    const container = document.getElementById('fifteen-step-grid');
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const centers: Point[] = [];

    for (let i = 0; i < stepCount; i++) {
      const card = container.querySelector<HTMLElement>(`[data-step-index="${i}"]`);
      if (!card) continue;

      const rect = card.getBoundingClientRect();
      centers.push({
        x: rect.left + rect.width / 2 - containerRect.left,
        y: rect.top + rect.height / 2 - containerRect.top,
      });
    }

    if (centers.length < 2) {
      setPathD('');
      setDiamonds([]);
      return;
    }

    const rows = groupCentersByRow(centers);
    setPathD(buildSerpentinePath(rows));
    setDiamonds(collectMidpoints(rows));
    setSize({
      width: containerRect.width,
      height: containerRect.height,
    });
  }, [stepCount]);

  useLayoutEffect(() => {
    updatePath();

    const container = document.getElementById('fifteen-step-grid');
    if (!container) return;

    const resizeObserver = new ResizeObserver(updatePath);
    resizeObserver.observe(container);
    window.addEventListener('resize', updatePath);

    const animationTimer = window.setTimeout(updatePath, 900);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updatePath);
      window.clearTimeout(animationTimer);
    };
  }, [updatePath]);

  if (!pathD || size.width === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-0 hidden lg:block"
      width={size.width}
      height={size.height}
      viewBox={`0 0 ${size.width} ${size.height}`}
      aria-hidden
    >
      <path
        d={pathD}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 7"
        className="text-border/80"
      />
      {diamonds.map((point, index) => (
        <rect
          key={index}
          x={point.x - 3}
          y={point.y - 3}
          width={6}
          height={6}
          className="fill-muted-foreground/35"
          transform={`rotate(45 ${point.x} ${point.y})`}
        />
      ))}
    </svg>
  );
}
