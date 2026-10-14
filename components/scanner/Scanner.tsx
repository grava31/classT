'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { renderScan, type FilterMode, type Rotation, type ScanOptions } from './imageFilters';

type Props = {
  assignmentId: string;
  userId: string;
};

const DEFAULT_OPTIONS: ScanOptions = {
  mode: 'scan',
  contrast: 1.35,
  brightness: 0,
  crop: { top: 0, bottom: 0, left: 0, right: 0 },
  rotate: 0,
};

const MODES: { value: FilterMode; label: string }[] = [
  { value: 'scan', label: 'مسح' },
  { value: 'bw', label: 'أبيض وأسود' },
  { value: 'gray', label: 'رمادي' },
  { value: 'color', label: 'ملوّن' },
];

export default function Scanner({ assignmentId, userId }: Props) {
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rawRef = useRef<HTMLCanvasElement | null>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<'camera' | 'edit'>('camera');
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [opts, setOpts] = useState<ScanOptions>(DEFAULT_OPTIONS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    stopStream();
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('المتصفح لا يدعم الكاميرا المباشرة. استخدم زر "من الجهاز".');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setError('تعذّر الوصول إلى الكاميرا. تحقق من الأذونات أو استخدم "من الجهاز".');
    }
  }, [facing, stopStream]);

  // تشغيل الكاميرا في مرحلة الالتقاط وإيقافها عند الانتقال
  useEffect(() => {
    if (phase === 'camera' && !done) startCamera();
    return stopStream;
  }, [phase, done, startCamera, stopStream]);

  // إعادة رسم المعاينة عند تغيير أي إعداد
  useEffect(() => {
    if (phase !== 'edit' || !rawRef.current || !previewRef.current) return;
    const id = requestAnimationFrame(() => {
      if (rawRef.current && previewRef.current) renderScan(rawRef.current, previewRef.current, opts);
    });
    return () => cancelAnimationFrame(id);
  }, [phase, opts]);

  const capture = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d')?.drawImage(v, 0, 0);
    rawRef.current = c;
    setOpts(DEFAULT_OPTIONS);
    stopStream();
    setPhase('edit');
  };

  const onFile = async (file: File) => {
    try {
      const bitmap = await createImageBitmap(file);
      const c = document.createElement('canvas');
      c.width = bitmap.width;
      c.height = bitmap.height;
      c.getContext('2d')?.drawImage(bitmap, 0, 0);
      bitmap.close();
      rawRef.current = c;
      setOpts(DEFAULT_OPTIONS);
      setPhase('edit');
    } catch {
      setError('تعذّر فتح الصورة. جرّب صورة أخرى.');
    }
  };

  const upload = async () => {
    const canvas = previewRef.current;
    if (!canvas) return;
    setBusy(true);
    setError(null);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.88),
    );
    if (!blob) {
      setError('تعذّر تجهيز الصورة للرفع.');
      setBusy(false);
      return;
    }

    const supabase = createClient();
    const path = `${userId}/${assignmentId}/${Date.now()}.jpg`;

    const { error: upErr } = await supabase.storage
      .from('submissions')
      .upload(path, blob, { contentType: 'image/jpeg' });
    if (upErr) {
      setError(upErr.message);
      setBusy(false);
      return;
    }

    const { error: dbErr } = await supabase.from('submissions').upsert(
      {
        assignment_id: assignmentId,
        student_id: userId,
        image_path: path,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'assignment_id,student_id' },
    );
    if (dbErr) {
      setError(dbErr.message);
      setBusy(false);
      return;
    }

    setBusy(false);
    setDone(true);
    router.refresh();
  };

  const setCrop = (side: keyof ScanOptions['crop'], value: number) =>
    setOpts((o) => ({ ...o, crop: { ...o.crop, [side]: value } }));

  if (done) {
    return (
      <div className="rounded-3xl bg-ios-green/10 p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-ios-green text-xl text-white">✓</div>
        <p className="text-[17px] font-semibold">تم إرسال حلّك بنجاح</p>
        <p className="mt-1 text-sm text-ios-sub">سيظهر التصحيح هنا بعد أن يراجعه الأستاذ.</p>
        <button className="btn-secondary mt-5" onClick={() => { setDone(false); setPhase('camera'); }}>
          إرسال نسخة أخرى
        </button>
      </div>
    );
  }

  if (phase === 'camera') {
    return (
      <div className="space-y-4">
        <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-black sm:aspect-video">
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-dashed border-white/70" />
          <p className="absolute bottom-4 inset-x-0 text-center text-xs text-white/80">ضع الورقة داخل الإطار وتأكد من الإضاءة</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button className="btn-secondary" onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}>
            تبديل
          </button>
          <button className="btn-primary" onClick={capture}>التقاط</button>
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}>من الجهاز</button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = '';
          }}
        />

        {error && <p className="text-sm text-ios-red">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-center rounded-3xl bg-ios-bg p-4">
        <canvas ref={previewRef} className="max-h-[62vh] w-auto max-w-full rounded-xl bg-white shadow-md" />
      </div>

      <div className="card space-y-6 !p-5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setOpts((o) => ({ ...o, mode: m.value }))}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                opts.mode === m.value ? 'bg-ios-ink text-white' : 'bg-black/5 text-ios-ink hover:bg-black/10'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Slider label="التباين" value={opts.contrast} min={0.8} max={2.2} step={0.05}
            onChange={(v) => setOpts((o) => ({ ...o, contrast: v }))} />
          <Slider label="السطوع" value={opts.brightness} min={-40} max={40} step={1}
            onChange={(v) => setOpts((o) => ({ ...o, brightness: v }))} />
        </div>

        <div>
          <p className="label">قصّ الحواف</p>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            <Slider label="أعلى" value={opts.crop.top} min={0} max={0.3} step={0.01} onChange={(v) => setCrop('top', v)} />
            <Slider label="أسفل" value={opts.crop.bottom} min={0} max={0.3} step={0.01} onChange={(v) => setCrop('bottom', v)} />
            <Slider label="يسار" value={opts.crop.left} min={0} max={0.3} step={0.01} onChange={(v) => setCrop('left', v)} />
            <Slider label="يمين" value={opts.crop.right} min={0} max={0.3} step={0.01} onChange={(v) => setCrop('right', v)} />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="btn-secondary h-9 px-4 text-sm"
            onClick={() => setOpts((o) => ({ ...o, rotate: (((o.rotate + 90) % 360) as Rotation) }))}
          >
            تدوير ٩٠°
          </button>
          <button className="btn-secondary h-9 px-4 text-sm" onClick={() => setOpts(DEFAULT_OPTIONS)}>
            إعادة الضبط
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-ios-red">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <button className="btn-secondary" disabled={busy} onClick={() => setPhase('camera')}>
          إعادة الالتقاط
        </button>
        <button className="btn-primary" disabled={busy} onClick={upload}>
          {busy ? 'جارٍ الرفع…' : 'إرسال الحل'}
        </button>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex justify-between text-xs text-ios-sub">
        <span>{label}</span>
        <span className="tabular-nums" dir="ltr">{value.toFixed(step < 1 ? 2 : 0)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-ios-blue"
      />
    </label>
  );
}
