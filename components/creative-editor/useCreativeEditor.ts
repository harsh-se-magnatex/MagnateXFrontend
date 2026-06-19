// EDIT_PHOTO_DISABLED — module preserved for Edit_Photo_V1; not imported on App_Mode.
'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Canvas, FabricImage, Rect, Shadow, Textbox, type FabricObject } from 'fabric';
import type { CreativeDesignDocument, CreativeDesignObject, CreativeTextObject } from '@/lib/creative-design/types';
import { collectFontsFromDesign, loadGoogleFonts } from '@/lib/creative-design/load-google-fonts';

export type SelectedObjectKind = 'text' | 'image' | null;

const BG_OBJECT_ID = '__background__';

type DesignMeta = {
  left: number;
  top: number;
  scaleX: number;
  scaleY: number;
  fontSize?: number;
  width?: number;
  angle?: number;
};

function setDesignMeta(obj: FabricObject, meta: DesignMeta) {
  (obj as unknown as { designMeta: DesignMeta }).designMeta = meta;
}

function getDesignMeta(obj: FabricObject): DesignMeta | undefined {
  return (obj as unknown as { designMeta?: DesignMeta }).designMeta;
}

function isEditableLayer(obj: FabricObject): boolean {
  return obj.selectable !== false && (obj as unknown as { id?: string }).id !== BG_OBJECT_ID;
}

function clampObjectToCanvas(obj: FabricObject, canvasWidth: number, canvasHeight: number) {
  obj.setCoords();
  const rect = obj.getBoundingRect();

  let dx = 0;
  let dy = 0;

  if (rect.left < 0) dx = -rect.left;
  if (rect.top < 0) dy = -rect.top;
  if (rect.left + rect.width > canvasWidth) {
    dx = canvasWidth - (rect.left + rect.width);
  }
  if (rect.top + rect.height > canvasHeight) {
    dy = canvasHeight - (rect.top + rect.height);
  }

  if (dx !== 0 || dy !== 0) {
    obj.set({
      left: (obj.left ?? 0) + dx,
      top: (obj.top ?? 0) + dy,
    });
    obj.setCoords();
  }
}

function bindCanvasConstraints(
  canvas: Canvas,
  getCanvasSize: () => { width: number; height: number },
  getDisplayScale: () => number
) {
  const onTransform = (e: { target?: FabricObject }) => {
    const target = e.target;
    if (!target || !isEditableLayer(target)) return;
    const { width, height } = getCanvasSize();
    clampObjectToCanvas(target, width, height);
  };

  const onModified = (e: { target?: FabricObject }) => {
    const target = e.target;
    if (!target || !isEditableLayer(target)) return;
    syncDesignMetaFromDisplay(target, getDisplayScale());
  };

  canvas.on('object:moving', onTransform);
  canvas.on('object:scaling', onTransform);
  canvas.on('object:rotating', onTransform);
  canvas.on('object:modified', (e) => {
    onTransform(e);
    onModified(e);
  });
}

function layoutBackgroundCover(bg: FabricImage, canvasWidth: number, canvasHeight: number) {
  const imgW = bg.width || canvasWidth;
  const imgH = bg.height || canvasHeight;
  const coverScale = Math.max(canvasWidth / imgW, canvasHeight / imgH);

  bg.set({
    left: canvasWidth / 2,
    top: canvasHeight / 2,
    originX: 'center',
    originY: 'center',
    scaleX: coverScale,
    scaleY: coverScale,
    selectable: false,
    evented: false,
    hasControls: false,
    hasBorders: false,
  });
}

function applyObjectToDisplay(
  obj: FabricObject,
  displayScale: number,
  canvasWidth: number,
  canvasHeight: number
) {
  const meta = getDesignMeta(obj);
  if (!meta) return;

  if (obj instanceof Textbox) {
    obj.set({
      left: meta.left * displayScale,
      top: meta.top * displayScale,
      fontSize: (meta.fontSize ?? obj.fontSize ?? 24) * displayScale,
      scaleX: 1,
      scaleY: 1,
      angle: meta.angle ?? 0,
    });
    if (meta.width) {
      obj.set({ width: meta.width * displayScale });
    }
  } else if (obj instanceof FabricImage) {
    obj.set({
      left: meta.left * displayScale,
      top: meta.top * displayScale,
      scaleX: meta.scaleX * displayScale,
      scaleY: meta.scaleY * displayScale,
      angle: meta.angle ?? 0,
    });
  }

  clampObjectToCanvas(obj, canvasWidth, canvasHeight);
}

function syncDesignMetaFromDisplay(obj: FabricObject, displayScale: number) {
  const meta = getDesignMeta(obj);
  if (!meta || displayScale <= 0) return;

  if (obj instanceof Textbox) {
    setDesignMeta(obj, {
      ...meta,
      left: (obj.left ?? 0) / displayScale,
      top: (obj.top ?? 0) / displayScale,
      fontSize: Number(obj.fontSize ?? meta.fontSize ?? 24) / displayScale,
      width: obj.width ? obj.width / displayScale : meta.width,
      angle: obj.angle ?? 0,
    });
    return;
  }

  if (obj instanceof FabricImage) {
    setDesignMeta(obj, {
      ...meta,
      left: (obj.left ?? 0) / displayScale,
      top: (obj.top ?? 0) / displayScale,
      scaleX: (obj.scaleX ?? 1) / displayScale,
      scaleY: (obj.scaleY ?? 1) / displayScale,
      angle: obj.angle ?? 0,
    });
  }
}

function syncCanvasToDisplay(
  canvas: Canvas,
  stageEl: HTMLDivElement,
  design: CreativeDesignDocument,
  containerWidth: number,
  containerHeight: number
): number {
  if (containerWidth <= 0 || containerHeight <= 0) return 1;

  const padding = 16;
  const availW = Math.max(containerWidth - padding * 2, 1);
  const availH = Math.max(containerHeight - padding * 2, 1);
  const displayScale = Math.min(availW / design.width, availH / design.height);

  const displayW = Math.round(design.width * displayScale);
  const displayH = Math.round(design.height * displayScale);

  stageEl.style.width = `${displayW}px`;
  stageEl.style.height = `${displayH}px`;

  canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  canvas.setZoom(1);
  canvas.setDimensions({ width: displayW, height: displayH });

  const clipRect = new Rect({
    left: 0,
    top: 0,
    width: displayW,
    height: displayH,
    absolutePositioned: true,
  });
  canvas.clipPath = clipRect;

  for (const obj of canvas.getObjects()) {
    if ((obj as unknown as { id?: string }).id === BG_OBJECT_ID) {
      layoutBackgroundCover(obj as FabricImage, displayW, displayH);
      continue;
    }
    if (isEditableLayer(obj)) {
      applyObjectToDisplay(obj, displayScale, displayW, displayH);
    }
  }

  canvas.calcOffset();
  canvas.requestRenderAll();

  return displayScale;
}

async function loadBackgroundImage(
  canvas: Canvas,
  design: CreativeDesignDocument
): Promise<FabricImage> {
  const bg = await FabricImage.fromURL(design.backgroundUrl, {
    crossOrigin: 'anonymous',
  });
  (bg as unknown as { id: string }).id = BG_OBJECT_ID;
  canvas.add(bg);
  canvas.sendObjectToBack(bg);
  layoutBackgroundCover(bg, design.width, design.height);
  return bg;
}

export function useCreativeEditor(
  designJson: CreativeDesignDocument | undefined,
  stageRef: RefObject<HTMLDivElement | null>,
  viewportRef: RefObject<HTMLDivElement | null>
) {
  const fabricRef = useRef<Canvas | null>(null);
  const displayScaleRef = useRef(1);
  const [ready, setReady] = useState(false);
  const [selectedKind, setSelectedKind] = useState<SelectedObjectKind>(null);
  const [activeTextProps, setActiveTextProps] = useState<{
    fill: string;
    fontSize: number;
    fontFamily: string;
    fontWeight: string;
    textAlign: string;
  } | null>(null);

  const syncSelection = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active || !isEditableLayer(active)) {
      setSelectedKind(null);
      setActiveTextProps(null);
      return;
    }
    if (active instanceof Textbox) {
      setSelectedKind('text');
      setActiveTextProps({
        fill: String(active.fill || '#FFFFFF'),
        fontSize: Number(active.fontSize || 24),
        fontFamily: String(active.fontFamily || 'Inter'),
        fontWeight: String(active.fontWeight || '700'),
        textAlign: String(active.textAlign || 'left'),
      });
      return;
    }
    if (active instanceof FabricImage) {
      setSelectedKind('image');
      setActiveTextProps(null);
      return;
    }
    setSelectedKind(null);
    setActiveTextProps(null);
  }, []);

  const fitToContainer = useCallback(
    (containerWidth: number, containerHeight: number) => {
      const canvas = fabricRef.current;
      const stageEl = stageRef.current;
      if (!canvas || !stageEl || !designJson) return;
      displayScaleRef.current = syncCanvasToDisplay(
        canvas,
        stageEl,
        designJson,
        containerWidth,
        containerHeight
      );
    },
    [designJson, stageRef]
  );

  useEffect(() => {
    if (!designJson || !stageRef.current) return;

    let disposed = false;
    let canvas: Canvas | null = null;
    const stageEl = stageRef.current;

    async function init() {
      await loadGoogleFonts(collectFontsFromDesign(designJson));

      if (disposed || !stageRef.current) return;

      stageEl.replaceChildren();
      const canvasEl = document.createElement('canvas');
      stageEl.appendChild(canvasEl);

      canvas = new Canvas(canvasEl, {
        width: designJson!.width,
        height: designJson!.height,
        preserveObjectStacking: true,
        selection: true,
        enableRetinaScaling: false,
      });
      fabricRef.current = canvas;

      await loadBackgroundImage(canvas, designJson!);

      for (const obj of designJson!.objects) {
        const fabricObj = await objectFromDesign(obj);
        if (fabricObj) canvas.add(fabricObj);
      }

      bindCanvasConstraints(
        canvas,
        () => ({
          width: canvas!.getWidth(),
          height: canvas!.getHeight(),
        }),
        () => displayScaleRef.current
      );

      canvas.on('selection:created', syncSelection);
      canvas.on('selection:updated', syncSelection);
      canvas.on('selection:cleared', syncSelection);
      canvas.on('object:modified', syncSelection);

      const firstText = canvas.getObjects().find((o) => o instanceof Textbox);
      if (firstText) {
        canvas.setActiveObject(firstText);
        syncSelection();
      }

      canvas.renderAll();
      setReady(true);

      const viewportEl = viewportRef.current;
      if (viewportEl) {
        displayScaleRef.current = syncCanvasToDisplay(
          canvas,
          stageEl,
          designJson!,
          viewportEl.clientWidth,
          viewportEl.clientHeight
        );
      }
    }

    init().catch(console.error);

    return () => {
      disposed = true;
      canvas?.dispose();
      fabricRef.current = null;
      stageEl.replaceChildren();
      stageEl.style.width = '';
      stageEl.style.height = '';
      setReady(false);
    };
  }, [designJson, stageRef, viewportRef, syncSelection]);

  const exportDesignJson = useCallback((): CreativeDesignDocument | null => {
    const canvas = fabricRef.current;
    if (!canvas || !designJson) return null;

    const scale = displayScaleRef.current || 1;
    const objects: CreativeDesignObject[] = [];

    for (const obj of canvas.getObjects()) {
      if (!isEditableLayer(obj)) continue;

      if (obj instanceof Textbox) {
        objects.push({
          type: 'textbox',
          id: String((obj as unknown as { id?: string }).id || `text-${objects.length}`),
          text: obj.text || '',
          left: (obj.left || 0) / scale,
          top: (obj.top || 0) / scale,
          fontSize: Number(obj.fontSize || 24) / scale,
          fontFamily: String(obj.fontFamily || 'Inter'),
          fill: String(obj.fill || '#FFFFFF'),
          fontWeight: obj.fontWeight,
          fontStyle: String(obj.fontStyle || 'normal'),
          textAlign: (obj.textAlign as 'left' | 'center' | 'right') || 'left',
          angle: obj.angle || 0,
        });
      } else if (obj instanceof FabricImage) {
        const meta = getDesignMeta(obj);
        objects.push({
          type: 'image',
          id: 'logo',
          src: String((obj as unknown as { src?: string }).src || ''),
          left: meta?.left ?? (obj.left || 0) / scale,
          top: meta?.top ?? (obj.top || 0) / scale,
          width: (obj.width || 0) * (obj.scaleX || 1) / scale,
          height: (obj.height || 0) * (obj.scaleY || 1) / scale,
          angle: obj.angle || 0,
          scaleX: (obj.scaleX || 1) / scale,
          scaleY: (obj.scaleY || 1) / scale,
        });
      }
    }

    return {
      version: 1,
      width: designJson.width,
      height: designJson.height,
      backgroundUrl: designJson.backgroundUrl,
      objects,
    };
  }, [designJson]);

  const exportPngDataUrl = useCallback((): string | null => {
    const canvas = fabricRef.current;
    if (!canvas || !designJson) return null;

    const scale = displayScaleRef.current || 1;
    return canvas.toDataURL({
      format: 'png',
      multiplier: 1 / scale,
    });
  }, [designJson]);

  const deleteSelected = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active || !isEditableLayer(active)) return;
    canvas.remove(active);
    canvas.discardActiveObject();
    canvas.renderAll();
    syncSelection();
  }, [syncSelection]);

  const updateActiveText = useCallback(
    (patch: Partial<{ fill: string; fontSize: number; fontFamily: string; fontWeight: string; textAlign: string }>) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const active = canvas.getActiveObject();
      if (!(active instanceof Textbox)) return;
      active.set(patch as Record<string, unknown>);
      clampObjectToCanvas(active, canvas.getWidth(), canvas.getHeight());
      canvas.renderAll();
      syncSelection();
    },
    []
  );

  return {
    ready,
    selectedKind,
    activeTextProps,
    fitToContainer,
    exportDesignJson,
    exportPngDataUrl,
    deleteSelected,
    updateActiveText,
  };
}

async function objectFromDesign(obj: CreativeDesignObject) {
  if (obj.type === 'textbox') {
    const shadow = obj.shadow
      ? new Shadow({
          color: obj.shadow.color,
          blur: obj.shadow.blur,
          offsetX: obj.shadow.offsetX,
          offsetY: obj.shadow.offsetY,
        })
      : undefined;

    const textWidth = Math.round(
      (obj as CreativeTextObject).fontSize * Math.max(obj.text.length * 0.55, 8)
    );

    const textbox = new Textbox(obj.text, {
      left: obj.left,
      top: obj.top,
      fontSize: obj.fontSize,
      fontFamily: obj.fontFamily,
      fill: obj.fill,
      fontWeight: obj.fontWeight,
      fontStyle: obj.fontStyle,
      textAlign: obj.textAlign,
      angle: obj.angle,
      width: textWidth,
      shadow,
      editable: true,
      originX: obj.textAlign === 'center' ? 'center' : obj.textAlign === 'right' ? 'right' : 'left',
    });
    (textbox as unknown as { id: string }).id = obj.id;
    setDesignMeta(textbox, {
      left: obj.left,
      top: obj.top,
      scaleX: 1,
      scaleY: 1,
      fontSize: obj.fontSize,
      width: textWidth,
      angle: obj.angle,
    });
    return textbox;
  }

  if (obj.type === 'image') {
    const img = await FabricImage.fromURL(obj.src, { crossOrigin: 'anonymous' });
    const scaleX = obj.scaleX ?? obj.width / (img.width || obj.width);
    const scaleY = obj.scaleY ?? obj.height / (img.height || obj.height);
    img.set({
      left: obj.left,
      top: obj.top,
      scaleX,
      scaleY,
      angle: obj.angle ?? 0,
    });
    (img as unknown as { id: string; src: string }).id = obj.id;
    (img as unknown as { src: string }).src = obj.src;
    setDesignMeta(img, {
      left: obj.left,
      top: obj.top,
      scaleX,
      scaleY,
      angle: obj.angle ?? 0,
    });
    return img;
  }

  return null;
}
