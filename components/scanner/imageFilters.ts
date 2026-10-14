/**
 * معالجة الصور لمحاكاة الماسح الضوئي داخل المتصفح.
 * - scan : إزالة الظلال وتوحيد الخلفية (أبيض ناصع للورق) + تباين
 * - bw   : أبيض وأسود بعتبة Otsu التلقائية (نص حاد جداً)
 * - gray : تدرج رمادي
 * - color: ألوان مع تباين وسطوع
 */

export type FilterMode = 'color' | 'gray' | 'scan' | 'bw';
export type Crop = { top: number; bottom: number; left: number; right: number };
export type Rotation = 0 | 90 | 180 | 270;

export interface ScanOptions {
  mode: FilterMode;
  contrast: number; // 0.8 – 2.2
  brightness: number; // -40 – 40
  crop: Crop; // نسبة من 0 إلى 0.3 لكل جانب
  rotate: Rotation;
}

export type Src = HTMLCanvasElement | HTMLImageElement | HTMLVideoElement | ImageBitmap;

function sourceSize(src: Src): [number, number] {
  if (src instanceof HTMLVideoElement) return [src.videoWidth, src.videoHeight];
  if (src instanceof HTMLImageElement) return [src.naturalWidth, src.naturalHeight];
  return [src.width, src.height];
}

/** متوسط محلي باستخدام الصورة التكاملية (Integral Image) — O(W·H) */
function boxMean(src: Float32Array, W: number, H: number, r: number): Float32Array {
  const stride = W + 1;
  const S = new Float64Array((W + 1) * (H + 1));

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      S[(y + 1) * stride + (x + 1)] =
        src[y * W + x] + S[y * stride + (x + 1)] + S[(y + 1) * stride + x] - S[y * stride + x];
    }
  }

  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(H - 1, y + r);
    for (let x = 0; x < W; x++) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(W - 1, x + r);
      const sum =
        S[(y1 + 1) * stride + (x1 + 1)] - S[y0 * stride + (x1 + 1)] - S[(y1 + 1) * stride + x0] + S[y0 * stride + x0];
      out[y * W + x] = sum / ((x1 - x0 + 1) * (y1 - y0 + 1));
    }
  }
  return out;
}

/** عتبة Otsu: تُقسّم الهيستوغرام إلى فئتين بأقصى تباين بينهما */
function otsu(values: Float32Array): number {
  const hist = new Uint32Array(256);
  for (let i = 0; i < values.length; i++) {
    const v = Math.min(255, Math.max(0, values[i] | 0));
    hist[v]++;
  }
  const total = values.length;
  let sumAll = 0;
  for (let t = 0; t < 256; t++) sumAll += t * hist[t];

  let sumB = 0;
  let wB = 0;
  let maxVar = 0;
  let threshold = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sumAll - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxVar) {
      maxVar = between;
      threshold = t;
    }
  }
  return threshold;
}

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

export function renderScan(src: Src, target: HTMLCanvasElement, opts: ScanOptions, maxSide = 1600) {
  const [sw, sh] = sourceSize(src);
  const { top, bottom, left, right } = opts.crop;

  // 1) القص
  const cx = Math.round(sw * left);
  const cy = Math.round(sh * top);
  const cw = Math.max(1, Math.round(sw * (1 - left - right)));
  const ch = Math.max(1, Math.round(sh * (1 - top - bottom)));

  // 2) التصغير للأداء على الهواتف
  const scale = Math.min(1, maxSide / Math.max(cw, ch));
  const w = Math.max(1, Math.round(cw * scale));
  const h = Math.max(1, Math.round(ch * scale));

  // 3) التدوير
  const quarter = opts.rotate === 90 || opts.rotate === 270;
  target.width = quarter ? h : w;
  target.height = quarter ? w : h;

  const ctx = target.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, target.width, target.height);
  ctx.translate(target.width / 2, target.height / 2);
  ctx.rotate((opts.rotate * Math.PI) / 180);
  ctx.drawImage(src, cx, cy, cw, ch, -w / 2, -h / 2, w, h);
  ctx.restore();

  const W = target.width;
  const H = target.height;
  const N = W * H;
  const image = ctx.getImageData(0, 0, W, H);
  const d = image.data;

  const curve = (v: number) => clamp255((v - 128) * opts.contrast + 128 + opts.brightness);

  if (opts.mode === 'color') {
    for (let i = 0; i < N; i++) {
      const j = i * 4;
      d[j] = curve(d[j]);
      d[j + 1] = curve(d[j + 1]);
      d[j + 2] = curve(d[j + 2]);
    }
    ctx.putImageData(image, 0, 0);
    return;
  }

  // luminance
  const gray = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const j = i * 4;
    gray[i] = 0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2];
  }

  let values: Float32Array = gray;

  if (opts.mode === 'scan' || opts.mode === 'bw') {
    // إزالة الإضاءة/الظلال: نقسم على الخلفية المحلية فيصبح الورق أبيض ناصعاً
    const r = Math.max(10, Math.round(Math.min(W, H) / 25));
    const bg = boxMean(gray, W, H, r);
    values = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      values[i] = clamp255((gray[i] / (bg[i] + 1)) * 255);
    }
  }

  for (let i = 0; i < N; i++) values[i] = curve(values[i]);

  if (opts.mode === 'bw') {
    const t = otsu(values);
    for (let i = 0; i < N; i++) values[i] = values[i] > t ? 255 : 0;
  }

  for (let i = 0; i < N; i++) {
    const j = i * 4;
    const v = values[i];
    d[j] = v;
    d[j + 1] = v;
    d[j + 2] = v;
    d[j + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}
