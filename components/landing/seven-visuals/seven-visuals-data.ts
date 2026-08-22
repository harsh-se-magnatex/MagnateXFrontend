export type SevenVisual = {
  id: string;
  image: string;
  captionFile: string;
  alt: string;
  carousel?: string[];
};

export type SevenVisualStyle = {
  id: string;
  label: string;
  description: string;
  folder: string;
  visuals: SevenVisual[];
};

const style = (
  folder: string,
  label: string,
  description: string
): SevenVisualStyle => ({
  id: folder.toLowerCase(),
  label,
  description,
  folder,
  visuals: [
    ...Array.from({ length: 7 }, (_, index) => {
      const imageNumber = index + 1;
      const extension = imageNumber === 3 || imageNumber === 4 ? 'png' : 'jpg';
      return {
        id: `image${imageNumber}`,
        image: `/landing/how-it-looks/seven-visuals/${folder}/image${imageNumber}/post.${extension}`,
        captionFile: `/landing/how-it-looks/seven-visuals/${folder}/image${imageNumber}/caption.txt`,
        alt: `${label} page visual ${imageNumber}`,
      };
    }),
    {
      id: 'carousel',
      image: `/landing/how-it-looks/seven-visuals/${folder}/carousel/slide1/post.jpg`,
      captionFile: `/landing/how-it-looks/seven-visuals/${folder}/carousel/caption.txt`,
      alt: `${label} carousel visual`,
      carousel: [1, 2, 3].map(
        (slide) =>
          `/landing/how-it-looks/seven-visuals/${folder}/carousel/slide${slide}/post.jpg`
      ),
    },
  ],
});

export const SEVEN_VISUAL_STYLES: SevenVisualStyle[] = [
  style('Professional', 'Professional', 'Polished content built for credibility'),
  style('vibrant', 'Vibrant', 'Energetic colour and expressive composition'),
  style('Maximalist', 'Maximalist', 'Layered, rich, and impossible to ignore'),
  style('MiniMalist', 'Minimalist', 'Clean layouts with room to breathe'),
  style('Elegant', 'Elegant', 'Refined visuals with a premium feel'),
  style('Playful', 'Playful', 'Warm, friendly, and full of personality'),
  style('Bold', 'Bold', 'High-contrast content that makes an entrance'),
];

export const DEFAULT_SEVEN_VISUAL_STYLE = SEVEN_VISUAL_STYLES[0].id;
