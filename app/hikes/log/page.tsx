"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { Search, X, Camera, ChevronLeft, Loader2, Mountain } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createHike, uploadHikePhotos } from "@/app/actions/hikes";
import { DifficultyChip } from "@/components/trail/DifficultyChip";
import { cn } from "@/lib/utils";

// ── Types & schema ───────────────────────────────────────────────────────────

const schema = z.object({
  trail_id: z.string().min(1, "Please select a trail"),
  trail_name: z.string(),
  trail_slug: z.string(),
  trail_difficulty: z.string(),
  hiked_at: z.string().min(1, "Date is required"),
  duration_hours: z.string(),
  duration_minutes_part: z.string(),
  notes: z.string().max(2000).optional(),
  conditions: z.string().optional(),
  visibility: z.enum(["public", "friends", "private"]),
});

type FormValues = z.infer<typeof schema>;

type TrailResult = {
  id: string;
  slug: string;
  name: string;
  difficulty: "easy" | "moderate" | "hard";
  distance_mi: number;
  hero_photo_url: string | null;
};

const STEPS = ["Trail", "Date", "Photos", "Notes"];
const SESSION_KEY = "hike-log-draft";
const CONDITIONS = ["Excellent", "Good", "Fair", "Poor"];

// ── Helpers ──────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().split("T")[0]!;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HikeLogPage() {
  return (
    <Suspense>
      <HikeLogForm />
    </Suspense>
  );
}

function HikeLogForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    setValue,
    watch,
    trigger,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      trail_id: "",
      trail_name: "",
      trail_slug: "",
      trail_difficulty: "",
      hiked_at: today(),
      duration_hours: "",
      duration_minutes_part: "0",
      notes: "",
      conditions: "",
      visibility: "friends",
    },
  });

  // Restore from sessionStorage (draft takes priority over default preference)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<FormValues>;
        (Object.keys(parsed) as (keyof FormValues)[]).forEach((k) => {
          const v = parsed[k];
          if (v !== undefined) setValue(k, v as string);
        });
      } else {
        // No draft — apply default visibility preference from settings
        const pref = localStorage.getItem("hike-visibility-default") as FormValues["visibility"] | null;
        if (pref) setValue("visibility", pref);
      }
    } catch {}
  }, [setValue]);

  // Pre-populate trail from ?trail=<slug>
  useEffect(() => {
    const slug = searchParams.get("trail");
    if (!slug || watch("trail_id")) return;
    createClient()
      .from("trails")
      .select("id, slug, name, difficulty, distance_mi, hero_photo_url")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setValue("trail_id", data.id);
        setValue("trail_name", data.name);
        setValue("trail_slug", data.slug);
        setValue("trail_difficulty", data.difficulty);
      });
  }, [searchParams, setValue, watch]);

  // Revoke object URLs on unmount
  useEffect(() => () => { previews.forEach(URL.revokeObjectURL); }, []); // eslint-disable-line

  function saveSession() {
    const vals = watch();
    const { ...toSave } = vals; // exclude nothing — files aren't in the form
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(toSave)); } catch {}
  }

  async function goNext() {
    const valid = step === 0
      ? await trigger("trail_id")
      : step === 1
      ? await trigger("hiked_at")
      : true;
    if (!valid) return;
    saveSession();
    setStep((s) => s + 1);
  }

  function goBack() {
    saveSession();
    setStep((s) => s - 1);
  }

  function addPhotos(files: File[]) {
    const next = [...photos, ...files].slice(0, 10);
    setPhotos(next);
    const nextPreviews = next.map((f, i) => previews[i] ?? URL.createObjectURL(f));
    previews.forEach((u, i) => { if (!next[i]) URL.revokeObjectURL(u); });
    setPreviews(next.map((_, i) => nextPreviews[i] ?? URL.createObjectURL(next[i]!)));
  }

  function removePhoto(idx: number) {
    URL.revokeObjectURL(previews[idx]!);
    setPhotos((p) => p.filter((_, i) => i !== idx));
    setPreviews((p) => p.filter((_, i) => i !== idx));
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    setSubmitError(null);

    const durationMinutes =
      (parseInt(values.duration_hours || "0") * 60) +
      parseInt(values.duration_minutes_part || "0");

    const result = await createHike({
      trail_id: values.trail_id,
      hiked_at: values.hiked_at,
      duration_minutes: durationMinutes > 0 ? durationMinutes : undefined,
      notes: values.notes || undefined,
      conditions: values.conditions || undefined,
      visibility: values.visibility,
    });

    if (!result.ok) {
      setSubmitError(result.error);
      setSubmitting(false);
      return;
    }

    if (photos.length > 0) {
      const fd = new FormData();
      photos.forEach((f) => fd.append("photos", f));
      await uploadHikePhotos(result.hikeId, fd);
      // Don't block redirect if upload fails — hike is created
    }

    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    router.push(`/hikes/${result.hikeId}`);
  }

  const trailName = watch("trail_name");
  const trailDifficulty = watch("trail_difficulty") as "easy" | "moderate" | "hard" | "";

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      {/* Header */}
      <h1 className="font-serif text-3xl font-medium text-text mb-8">Log a hike</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-10">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                  i < step ? "bg-accent text-accent-on" :
                  i === step ? "bg-accent text-accent-on" :
                  "bg-surface-muted text-text-muted"
                )}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span className={cn(
                "text-[10px] font-medium tracking-wide",
                i === step ? "text-accent" : "text-text-muted"
              )}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                "h-px flex-1 mx-2 mb-4 transition-colors",
                i < step ? "bg-accent" : "bg-border"
              )} style={{ width: 40 }} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Step 0: Pick trail ──────────────────────────────────────── */}
        {step === 0 && (
          <TrailStep
            selectedId={watch("trail_id")}
            selectedName={trailName}
            selectedDifficulty={trailDifficulty}
            onSelect={(t) => {
              setValue("trail_id", t.id, { shouldValidate: true });
              setValue("trail_name", t.name);
              setValue("trail_slug", t.slug);
              setValue("trail_difficulty", t.difficulty);
            }}
            onClear={() => {
              setValue("trail_id", "");
              setValue("trail_name", "");
              setValue("trail_slug", "");
              setValue("trail_difficulty", "");
            }}
            error={errors.trail_id?.message}
          />
        )}

        {/* ── Step 1: Date + duration ─────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-soft">Date hiked</label>
              <input
                type="date"
                max={today()}
                {...register("hiked_at")}
                className="w-full h-10 px-3 rounded-md border border-border bg-surface-muted text-text text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
              />
              {errors.hiked_at && (
                <p className="text-xs text-danger">{errors.hiked_at.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-soft">Duration (optional)</label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="number"
                    min={0}
                    max={24}
                    placeholder="0"
                    {...register("duration_hours")}
                    className="w-full h-10 px-3 rounded-md border border-border bg-surface-muted text-text text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                  />
                  <p className="text-xs text-text-muted mt-1">hours</p>
                </div>
                <div className="flex-1">
                  <select
                    {...register("duration_minutes_part")}
                    className="w-full h-10 px-3 rounded-md border border-border bg-surface-muted text-text text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                  >
                    {[0, 15, 30, 45].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <p className="text-xs text-text-muted mt-1">minutes</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Photos ──────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-text-soft">
              Add up to 10 photos. Files are compressed to WebP on upload.
            </p>

            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {previews.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-surface-muted group">
                    <Image src={src} alt="" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {photos.length < 10 && (
              <label className="flex flex-col items-center justify-center gap-2 h-32 rounded-lg border-2 border-dashed border-border hover:border-accent transition-colors cursor-pointer">
                <Camera className="w-6 h-6 text-text-muted" strokeWidth={1.5} />
                <span className="text-sm text-text-muted">
                  {photos.length === 0 ? "Add photos" : `Add more (${photos.length}/10)`}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => addPhotos(Array.from(e.target.files ?? []))}
                />
              </label>
            )}
          </div>
        )}

        {/* ── Step 3: Notes / conditions / visibility ─────────────────── */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-soft">Trail conditions</label>
              <select
                {...register("conditions")}
                className="w-full h-10 px-3 rounded-md border border-border bg-surface-muted text-text text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
              >
                <option value="">Select conditions…</option>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c.toLowerCase()}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-soft">Notes (optional)</label>
              <textarea
                {...register("notes")}
                placeholder="How was the hike? Any trail notes, wildlife, highlights…"
                rows={5}
                className="w-full px-3 py-2 rounded-md border border-border bg-surface-muted text-text text-sm resize-none focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft leading-relaxed"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-soft">Visibility</label>
              {(["friends", "public", "private"] as const).map((v) => (
                <label key={v} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    value={v}
                    {...register("visibility")}
                    className="mt-0.5 accent-accent"
                  />
                  <div>
                    <p className="text-sm font-medium text-text capitalize">{v}</p>
                    <p className="text-xs text-text-muted">
                      {v === "friends" ? "Visible to accepted friends" :
                       v === "public" ? "Visible to everyone" :
                       "Only visible to you"}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {submitError && (
              <p className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-md">{submitError}</p>
            )}
          </div>
        )}

        {/* ── Navigation ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={step === 0 ? () => router.back() : goBack}
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 0 ? "Cancel" : "Back"}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="px-6 py-2.5 rounded-md bg-accent text-accent-on text-sm font-medium hover:bg-accent-hover transition-colors"
            >
              Next →
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-accent text-accent-on text-sm font-medium hover:bg-accent-hover disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting
                ? photos.length > 0 ? "Uploading…" : "Saving…"
                : "Log hike"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// ── TrailStep ────────────────────────────────────────────────────────────────

function TrailStep({
  selectedId,
  selectedName,
  selectedDifficulty,
  onSelect,
  onClear,
  error,
}: {
  selectedId: string;
  selectedName: string;
  selectedDifficulty: "easy" | "moderate" | "hard" | "";
  onSelect: (t: TrailResult) => void;
  onClear: () => void;
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TrailResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await createClient()
        .from("trails")
        .select("id, slug, name, difficulty, distance_mi, hero_photo_url")
        .textSearch("search_vector", query, { type: "websearch", config: "english" })
        .limit(8);
      setResults((data ?? []) as TrailResult[]);
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  if (selectedId) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg border border-accent bg-accent-soft">
        <Mountain className="w-5 h-5 text-accent shrink-0" strokeWidth={1.5} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text truncate">{selectedName}</p>
          {selectedDifficulty && <DifficultyChip difficulty={selectedDifficulty} className="mt-1" />}
        </div>
        <button type="button" onClick={onClear} className="text-text-muted hover:text-text transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-text-soft">Which trail did you hike?</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" strokeWidth={1.5} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search trails…"
          autoFocus
          className="w-full h-10 pl-9 pr-3 rounded-md border border-border bg-surface-muted text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
      </div>

      {loading && (
        <p className="text-xs text-text-muted px-1 animate-pulse">Searching…</p>
      )}

      {results.length > 0 && (
        <div className="rounded-lg border border-border bg-bg-elevated overflow-hidden shadow-md">
          {results.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { onSelect(t); setQuery(""); setResults([]); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-muted text-left transition-colors"
            >
              <div className="relative w-10 aspect-square rounded-md overflow-hidden bg-surface-muted shrink-0">
                {t.hero_photo_url && (
                  <Image src={t.hero_photo_url} alt="" fill sizes="40px" className="object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text truncate">{t.name}</p>
                <p className="font-mono text-xs text-text-muted">{t.distance_mi} mi</p>
              </div>
              <DifficultyChip difficulty={t.difficulty} />
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
