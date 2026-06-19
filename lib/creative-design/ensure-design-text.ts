import type {
  CreativeDesignDocument,
  CreativeTextObject,
} from '@/lib/creative-design/types';
import { extractOverlayHeadlineFromCaption } from '@/lib/creative-design/extract-overlay-headline';

// EDIT_PHOTO_DISABLED — module preserved for Edit_Photo_V1; not imported on App_Mode.
/**
 * Ensures designJson has at least one editable text layer (for older posts
 * saved before mandate-tier fallback existed).
 */
export function ensureDesignJsonHasText(
  designJson: CreativeDesignDocument,
  caption?: string | null
): CreativeDesignDocument {
  const hasText = designJson.objects.some((o) => o.type === 'textbox');
  if (hasText) return designJson;

  const headline = extractOverlayHeadlineFromCaption(String(caption || ''));
  if (!headline) return designJson;

  const textObject: CreativeTextObject = {
    type: 'textbox',
    id: 'headline-fallback',
    text: headline,
    left: Math.round(designJson.width * 0.06),
    top: Math.round(designJson.height * 0.68),
    fontSize: Math.round(designJson.height * 0.065),
    fontFamily: 'Playfair Display',
    fill: '#FFFFFF',
    fontWeight: 700,
    fontStyle: 'normal',
    textAlign: 'left',
    angle: 0,
    shadow: {
      color: 'rgba(0,0,0,0.45)',
      blur: 4,
      offsetX: 1,
      offsetY: 2,
    },
  };

  return {
    ...designJson,
    objects: [textObject, ...designJson.objects],
  };
}
