// EDIT_PHOTO_DISABLED — module preserved for Edit_Photo_V1; not imported on App_Mode.
/** Client-side creative design types (mirrors @sociogenie/shared/creative-design). */

export type MandateTierSnapshot = {
  tierIndex: number;
  rank: string;
  text: string;
  letterform: string;
  color: string;
};

export type MandateSnapshot = {
  preset?: string;
  layoutPosition?: string;
  separation?: string;
  tiers: MandateTierSnapshot[];
};

export type CreativeTextObject = {
  type: 'textbox';
  id: string;
  text: string;
  left: number;
  top: number;
  fontSize: number;
  fontFamily: string;
  fill: string;
  fontWeight?: string | number;
  fontStyle?: string;
  textAlign?: 'left' | 'center' | 'right';
  angle?: number;
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
  stroke?: string;
  strokeWidth?: number;
};

export type CreativeImageObject = {
  type: 'image';
  id: string;
  src: string;
  left: number;
  top: number;
  width: number;
  height: number;
  angle?: number;
  scaleX?: number;
  scaleY?: number;
};

export type CreativeDesignObject = CreativeTextObject | CreativeImageObject;

export type CreativeDesignDocument = {
  version: 1;
  width: number;
  height: number;
  backgroundUrl: string;
  objects: CreativeDesignObject[];
};

export type CreativeDesignMetadata = {
  backgroundUrl?: string;
  designJson?: CreativeDesignDocument;
  previewImageUrl?: string;
  mandateSnapshot?: MandateSnapshot | null;
  logoUrl?: string;
  canvasWidth?: number;
  canvasHeight?: number;
};

export type EditableCreative = CreativeDesignMetadata & {
  imageUrl?: string;
  platform?: string;
  scheduledPostId?: string;
};
