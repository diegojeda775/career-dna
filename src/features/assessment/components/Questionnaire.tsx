"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DIMENSIONS, DIM_KEYS } from "@/features/dna/dimensions";
import { CORE_QUESTIONS, SCALE_LABELS, SECTIONS, TOTAL_QUESTIONS, type Question } from "@/features/dna/questions";
import { buildProfile, selectProbes, type Answers, type AnswerValue } from "@/features/dna/profile";
import { completeAssessment, saveProgress } from "../actions";
import { questionSequence } from "../sequence";

type Props = {
  assessmentId: string;
  initialAnswers: Answers;
  initialPosition: number;
  initialProbeIds: string[];
};

const SCALE_VALUES = [-2, -1, 0, 1, 2] as const;

export function Questionnaire({ assessmentId, initialAnswers, initialPosition, initialProbeIds }: Props) {
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [probeIds, setProbeIds] = useState<string[]>(initialProbeIds);
  const [index, setIndex] = useState(initialPosition);
  const [showDeepDiveIntro, setShowDeepDiveIntro] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty">("saved");
  const [finishing, startFinishing] = useTransition();

  const sequence = useMemo(() => (probeIds.length ? questionSequence(probeIds) : CORE_QUESTIONS), [probeIds]);
  const atEnd = probeIds.length > 0 && index >= sequence.length;
  const question = sequence[Math.min(index, sequence.length - 1)]!;
  const answeredCount = sequence.filter((q) => q.id in answers).length;

  // ── Autosave ──────────────────────────────────────────────────────────────
  const latest = useRef({ answers, index, probeIds });
  latest.current = { answers, index, probeIds };
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    setSaveState("saving");
    try {
      const { answers, index, probeIds } = latest.current;
      await saveProgress(assessmentId, answers, index, probeIds);
      setSaveState("saved");
    } catch {
      setSaveState("dirty");
      toast.error("Couldn't save your progress. We'll keep trying.");
    }
  }, [assessmentId]);

  const scheduleSave = useCallback(() => {
    setSaveState("dirty");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, 1200);
  }, [flush]);

  useEffect(() => () => void (saveTimer.current && clearTimeout(saveTimer.current)), []);

  // ── Navigation ────────────────────────────────────────────────────────────
  function answer(value: AnswerValue) {
    const next = { ...answers, [question.id]: value };
    setAnswers(next);
    const nextIndex = index + 1;

    // Finished the core: choose the adaptive deep dive from everything learned so far
    if (probeIds.length === 0 && nextIndex >= CORE_QUESTIONS.length) {
      setProbeIds(selectProbes(next));
      setShowDeepDiveIntro(true);
    }
    setIndex(nextIndex);
    scheduleSave();
  }

  function back() {
    if (showDeepDiveIntro) setShowDeepDiveIntro(false);
    setIndex((i) => Math.max(0, i - 1));
    scheduleSave();
  }

  function finish() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    startFinishing(async () => {
      try {
        await completeAssessment(assessmentId, answers);
      } catch (e) {
        // redirect() inside the action throws a special error that Next handles
        if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
        toast.error(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  // Keyboard: 1–5 for scales, A–E for choices, Backspace to go back
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (atEnd || showDeepDiveIntro || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Backspace" && index > 0) return back();
      if (e.key === "Enter" && question.id in answers) return answer(answers[question.id] ?? null);
      if (question.kind === "choice") {
        const i = "abcdefg".indexOf(e.key.toLowerCase());
        if (i >= 0 && question.options[i]) answer(question.options[i]!.value);
      } else {
        const i = "12345".indexOf(e.key);
        if (i >= 0) answer(SCALE_VALUES[i]!);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── Render ────────────────────────────────────────────────────────────────
  const section = SECTIONS[question.section];
  const sectionQuestions = sequence.filter((q) => q.section === question.section);
  const sectionIndex = sectionQuestions.findIndex((q) => q.id === question.id);
  const progress = Math.round((answeredCount / TOTAL_QUESTIONS) * 100);
  const isRevisit = question.id in answers;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {answeredCount} of {TOTAL_QUESTIONS} answered
          </span>
          <span className="flex items-center gap-1.5">
            {saveState === "saving" && <Loader2 className="size-3.5 animate-spin" />}
            {saveState === "saved" && <Check className="size-3.5" />}
            {saveState === "saving" ? "Saving" : saveState === "saved" ? "Saved" : "Unsaved"}
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-chart-track"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Questionnaire progress"
        >
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {atEnd ? (
        <FinishCard onBack={back} onFinish={finish} finishing={finishing} />
      ) : showDeepDiveIntro ? (
        <DeepDiveIntro answers={answers} onContinue={() => setShowDeepDiveIntro(false)} onBack={back} />
      ) : (
        <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <p className="text-xs font-medium uppercase tracking-wider text-primary">
              {section.title} · {sectionIndex + 1}/{sectionQuestions.length}
            </p>
            {sectionIndex === 0 && <p className="mt-2 text-sm text-muted-foreground">{section.intro}</p>}
          </div>

          <QuestionBody key={question.id} question={question} value={answers[question.id]} onAnswer={answer} />

          {/* Revisited questions get a Next button so the existing answer can be kept as-is */}
          <div className="mt-8 grid grid-cols-3 items-center">
            <Button variant="ghost" size="sm" className="justify-self-start" onClick={back} disabled={index === 0}>
              <ArrowLeft /> Back
            </Button>
            {question.kind !== "choice" && (
              <Button
                variant="ghost"
                size="sm"
                className={cn("text-muted-foreground", isRevisit ? "col-start-2 justify-self-center" : "col-start-3 justify-self-end")}
                onClick={() => answer(null)}
              >
                Skip / not sure
              </Button>
            )}
            {isRevisit && (
              <Button size="sm" className="col-start-3 justify-self-end" onClick={() => answer(answers[question.id] ?? null)}>
                Next <ArrowRight />
              </Button>
            )}
          </div>
        </div>
      )}
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Tip: use keys {question.kind === "choice" ? "A–E" : "1–5"} to answer, Enter for next and Backspace to go back.
        Progress saves automatically.
      </p>
    </div>
  );
}

function QuestionBody({
  question,
  value,
  onAnswer,
}: {
  question: Question;
  value: AnswerValue | undefined;
  onAnswer: (v: AnswerValue) => void;
}) {
  if (question.kind === "choice") {
    return (
      <div>
        <h2 className="text-xl font-semibold leading-snug sm:text-2xl">{question.text}</h2>
        {question.help && <p className="mt-2 text-sm text-muted-foreground">{question.help}</p>}
        <div className="mt-6 grid gap-2">
          {question.options.map((o, i) => (
            <button
              key={o.value}
              onClick={() => onAnswer(o.value)}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors hover:border-primary hover:bg-accent",
                value === o.value && "border-primary bg-accent",
              )}
            >
              <kbd className="grid size-6 shrink-0 place-items-center rounded border text-xs text-muted-foreground">
                {"ABCDEFG"[i]}
              </kbd>
              <span>{o.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (question.kind === "spectrum") {
    return (
      <div>
        <h2 className="sr-only">Which sounds more like you?</h2>
        <div className="grid grid-cols-2 gap-4 text-base font-medium sm:text-lg">
          <p>{question.left}</p>
          <p className="text-right">{question.right}</p>
        </div>
        <div className="mt-6 flex items-center justify-between gap-2" role="radiogroup" aria-label="Where do you land?">
          {SCALE_VALUES.map((v, i) => {
            const size = ["size-12", "size-10", "size-8", "size-10", "size-12"][i];
            return (
              <button
                key={v}
                role="radio"
                aria-checked={value === v}
                aria-label={["Strongly left", "Somewhat left", "In between", "Somewhat right", "Strongly right"][i]}
                onClick={() => onAnswer(v)}
                className={cn(
                  "rounded-full border-2 transition-all hover:scale-110 hover:border-primary",
                  size,
                  value === v ? "border-primary bg-primary" : "border-border bg-background",
                )}
              />
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>More like this</span>
          <span>In between</span>
          <span>More like this</span>
        </div>
      </div>
    );
  }

  const labels = SCALE_LABELS[question.scale];
  return (
    <div>
      {question.scale !== "agree" && <p className="text-sm text-muted-foreground">A full afternoon of…</p>}
      <h2 className="mt-1 text-xl font-semibold leading-snug sm:text-2xl">{question.text}</h2>
      <div className="mt-6 grid grid-cols-5 gap-2" role="radiogroup" aria-label={question.text}>
        {SCALE_VALUES.map((v, i) => (
          <button
            key={v}
            role="radio"
            aria-checked={value === v}
            onClick={() => onAnswer(v)}
            className={cn(
              "flex min-h-20 flex-col items-center justify-center gap-1 rounded-lg border px-1 py-3 text-center text-xs transition-colors hover:border-primary sm:text-sm",
              value === v ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            <span className="text-base font-semibold">{["−−", "−", "○", "+", "++"][i]}</span>
            <span className="leading-tight">{labels[i]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DeepDiveIntro({ answers, onContinue, onBack }: { answers: Answers; onContinue: () => void; onBack: () => void }) {
  const profile = useMemo(() => buildProfile(answers), [answers]);
  const top = DIM_KEYS.slice()
    .sort((a, b) => profile.scores[b] - profile.scores[a])
    .slice(0, 4);
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
      <Sparkles className="size-8 text-primary" />
      <h2 className="mt-4 text-2xl font-semibold">Your DNA is taking shape</h2>
      <p className="mt-2 text-muted-foreground">
        So far your strongest signals are below. The last {SECTIONS.deep.title.toLowerCase()} questions are tailored to
        these, so we can tell apart the niche careers built on them.
      </p>
      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {top.map((d) => (
          <li key={d} className="rounded-lg border p-3">
            <p className="font-medium">{DIMENSIONS[d].label}</p>
            <p className="text-sm text-muted-foreground">{DIMENSIONS[d].blurb}</p>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft /> Back
        </Button>
        <Button onClick={onContinue}>Start the deep dive</Button>
      </div>
    </div>
  );
}

function FinishCard({ onBack, onFinish, finishing }: { onBack: () => void; onFinish: () => void; finishing: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-6 text-center shadow-sm sm:p-10">
      <Sparkles className="mx-auto size-10 text-primary" />
      <h2 className="mt-4 text-2xl font-semibold">That's everything</h2>
      <p className="mx-auto mt-2 max-w-md text-muted-foreground">
        We'll build your Career DNA and match it against every career in the database, including the ones you've
        probably never heard of.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Button variant="ghost" onClick={onBack} disabled={finishing}>
          <ArrowLeft /> Review last answer
        </Button>
        <Button size="lg" onClick={onFinish} disabled={finishing}>
          {finishing && <Loader2 className="animate-spin" />} See my matches
        </Button>
      </div>
    </div>
  );
}
