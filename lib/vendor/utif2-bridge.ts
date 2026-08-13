/**
 * ESM-friendly bridge for the vendored UTIF2 CJS bundle.
 */
import * as mod from './utif2.js';

type UtifApi = {
  decode: (buffer: ArrayBuffer) => Array<{
    width: number;
    height: number;
    data?: Uint8Array;
    [key: string]: unknown;
  }>;
  decodeImage: (buffer: ArrayBuffer, ifd: unknown) => void;
  toRGBA8: (ifd: unknown) => Uint8Array;
};

const UTIF = ((mod as { default?: UtifApi }).default ??
  (mod as unknown as UtifApi)) as UtifApi;

export default UTIF;
