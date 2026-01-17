"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { TIntentType } from "@plane/services";
import { cn } from "@plane/utils";
import { VoiceAssistantOverlay } from "@/components/speech";

type DemoState = "idle" | "menu" | "listening" | "processing" | "result";

type DemoResult = {
  intent: TIntentType;
  transcript: string;
  summary: string;
};

const demoCopy: Record<TIntentType, DemoResult> = {
  todo: {
    intent: "todo",
    transcript: "Demain, envoyer le récap au client, puis préparer les tickets pour la prochaine itération.",
    summary: "• Envoyer le récap au client\n• Préparer les tickets pour la prochaine itération",
  },
  note: {
    intent: "note",
    transcript: "Note rapide : le bug arrive quand on change le filtre puis on revient en arrière.",
    summary: "Bug lié au changement de filtre + navigation arrière.",
  },
  long_text: {
    intent: "long_text",
    transcript:
      "Rédiger un document court pour expliquer l’objectif, le contexte, et les étapes de la fonctionnalité speech-to-text.",
    summary: "Objectif + contexte + étapes pour la fonctionnalité speech-to-text.",
  },
  planning: {
    intent: "planning",
    transcript:
      "Planifier la semaine: lundi specs, mardi implémentation, mercredi QA, jeudi corrections, vendredi déploiement.",
    summary: "Lun: specs • Mar: impl • Mer: QA • Jeu: fixes • Ven: deploy",
  },
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export default function VoiceAssistantDemoPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<DemoState>("idle");
  const [selectedIntent, setSelectedIntent] = useState<TIntentType | null>(null);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0);
  const [result, setResult] = useState<DemoResult | null>(null);

  const overlayState = useMemo<"menu" | "listening" | "processing" | "result">(() => {
    if (state === "idle") return "menu";
    return state;
  }, [state]);

  const timeoutsRef = useRef<number[]>([]);

  const clearAllTimeouts = useCallback(() => {
    for (const id of timeoutsRef.current) window.clearTimeout(id);
    timeoutsRef.current = [];
  }, []);

  const open = useCallback(() => {
    clearAllTimeouts();
    setResult(null);
    setSelectedIntent(null);
    setDuration(0);
    setVolume(0);
    setIsOpen(true);
    setState("menu");
  }, [clearAllTimeouts]);

  const close = useCallback(() => {
    clearAllTimeouts();
    setIsOpen(false);
    setState("idle");
    setSelectedIntent(null);
    setDuration(0);
    setVolume(0);
  }, [clearAllTimeouts]);

  const stopAndProcess = useCallback(() => {
    clearAllTimeouts();
    setState("processing");

    const id = window.setTimeout(() => {
      if (!selectedIntent) return;
      const payload = demoCopy[selectedIntent];
      setResult(payload);
      setState("result");

      const autoCloseId = window.setTimeout(() => {
        close();
      }, 4500);

      timeoutsRef.current.push(autoCloseId);
    }, 1400);

    timeoutsRef.current.push(id);
  }, [clearAllTimeouts, close, selectedIntent]);

  const startWithIntent = useCallback(
    (intent: TIntentType) => {
      clearAllTimeouts();
      setSelectedIntent(intent);
      setResult(null);
      setDuration(0);
      setVolume(0);
      setState("listening");

      const id = window.setTimeout(() => {
        stopAndProcess();
      }, 4200);

      timeoutsRef.current.push(id);
    },
    [clearAllTimeouts, stopAndProcess]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      if (!isOpen) open();
      else close();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, isOpen, open]);

  useEffect(() => {
    if (state !== "listening") return;
    const id = window.setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(id);
  }, [state]);

  const volumeBase = useMemo(() => Math.random() * Math.PI * 2, []);

  useEffect(() => {
    if (state !== "listening") {
      setVolume(0);
      return;
    }

    const start = performance.now();
    const id = window.setInterval(() => {
      const t = (performance.now() - start) / 1000;
      const wave = Math.abs(Math.sin(t * 4 + volumeBase));
      const jitter = (Math.random() - 0.5) * 10;
      const next = 18 + wave * 75 + jitter;
      setVolume(clamp(next, 0, 100));
    }, 50);

    return () => window.clearInterval(id);
  }, [state, volumeBase]);

  useEffect(() => {
    return () => {
      clearAllTimeouts();
    };
  }, [clearAllTimeouts]);

  return (
    <div className="relative min-h-[100svh] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_10%,rgba(99,102,241,0.22),transparent_55%),radial-gradient(900px_circle_at_80%_30%,rgba(236,72,153,0.18),transparent_60%),radial-gradient(900px_circle_at_50%_90%,rgba(34,197,94,0.12),transparent_55%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.65),rgba(0,0,0,0.92))] dark:bg-[linear-gradient(to_bottom,rgba(0,0,0,0.65),rgba(0,0,0,0.92))]" />
      <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:64px_64px]" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 backdrop-blur-xl">
              <Sparkles className="size-4" />
              Démo UI — assistant vocal flottant
            </div>
            <div className="mt-5 text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Speech-to-text + waveform en overlay
            </div>
            <div className="mt-2 max-w-2xl text-sm text-white/70">
              Page de démonstration isolée. Clique sur le bouton micro (ou appuie sur Espace) pour ouvrir l’overlay. Le
              waveform est celui de ton composant.
            </div>
          </div>

          <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
            <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-right text-xs text-white/70 backdrop-blur-xl">
              <div className="text-white/90">Raccourcis</div>
              <div className="mt-1">Espace: ouvrir/fermer</div>
              <div>Esc (dans l’overlay): fermer/stop</div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <div className="text-sm font-medium text-white">Résultat (démo)</div>
            <div className="mt-2 text-xs text-white/60">Le texte ci-dessous se remplit quand la démo finit.</div>

            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="text-xs text-white/60">Intent</div>
                <div className="mt-1 font-mono text-sm text-white/90">{result?.intent ?? "—"}</div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="text-xs text-white/60">Transcript</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-white/85">{result?.transcript ?? "—"}</div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="text-xs text-white/60">Résumé</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-white/85">{result?.summary ?? "—"}</div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
            <div className="absolute inset-0 bg-[radial-gradient(500px_circle_at_30%_20%,rgba(59,130,246,0.18),transparent_60%),radial-gradient(500px_circle_at_80%_70%,rgba(168,85,247,0.14),transparent_60%)]" />

            <div className="relative p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white">Zone de travail (mock)</div>
                  <div className="mt-1 text-xs text-white/60">Juste un décor pour voir l’overlay flottant.</div>
                </div>
                <button
                  onClick={() => (isOpen ? close() : open())}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition",
                    "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                  )}
                >
                  <Mic className="size-4" />
                  {isOpen ? "Fermer" : "Ouvrir"}
                </button>
              </div>

              <div className="mt-6 grid gap-3">
                {[
                  { title: "Todo", meta: "3 items", tone: "from-emerald-500/15 to-transparent" },
                  { title: "Note", meta: "1 brouillon", tone: "from-sky-500/15 to-transparent" },
                  { title: "Document", meta: "0", tone: "from-violet-500/15 to-transparent" },
                  { title: "Planning", meta: "Cette semaine", tone: "from-pink-500/15 to-transparent" },
                ].map((item) => (
                  <div
                    key={item.title}
                    className={cn(
                      "rounded-xl border border-white/10 bg-gradient-to-br p-4",
                      item.tone,
                      "shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-white/90">{item.title}</div>
                      <div className="text-xs text-white/60">{item.meta}</div>
                    </div>
                    <div className="mt-2 text-xs text-white/60">
                      {item.title === "Todo" && "Crée des tâches depuis ta voix."}
                      {item.title === "Note" && "Capture une idée et l’AI corrige."}
                      {item.title === "Document" && "Dicte un texte long, structuré."}
                      {item.title === "Planning" && "Transforme la voix en planning."}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pointer-events-none absolute -bottom-16 -right-16 size-64 rounded-full bg-blue-500/10 blur-[80px]" />
          </div>
        </div>
      </div>

      <button
        onClick={() => (isOpen ? close() : open())}
        className={cn(
          "fixed bottom-6 right-6 z-40 inline-flex items-center gap-3 rounded-2xl border px-4 py-3",
          "border-white/10 bg-black/55 text-white/90 backdrop-blur-xl",
          "shadow-[0_18px_60px_rgba(0,0,0,0.55)] transition",
          "hover:bg-black/65"
        )}
      >
        <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/20">
          <Mic className="size-5 text-white" />
        </span>
        <span className="flex flex-col items-start">
          <span className="text-xs font-medium">Voice Assistant</span>
          <span className="text-[11px] text-white/65">Espace pour activer</span>
        </span>
      </button>

      <AnimatePresence>
        {isOpen && state !== "idle" && (
          <VoiceAssistantOverlay
            state={overlayState}
            intent={selectedIntent}
            duration={duration}
            volume={volume}
            onSelectIntent={(intent) => startWithIntent(intent)}
            onStop={stopAndProcess}
            onClose={close}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && state === "result" && result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-6 z-40 max-w-[520px] rounded-2xl border border-white/10 bg-black/55 p-4 text-white/90 backdrop-blur-xl"
          >
            <div className="text-xs font-medium text-white/80">AI output</div>
            <div className="mt-2 whitespace-pre-wrap text-sm text-white/90">{result.summary}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
