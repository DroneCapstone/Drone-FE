import { type FormEvent, type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, LoaderCircle, Send, X } from "lucide-react";
import mascotDirections from "../../../assets/mascot/delivery-drone-directions.webp";
import mascotReactions from "../../../assets/mascot/delivery-drone-reactions.webp";
import {
  askTechnicianChatbot,
  getTechnicianQuickQuestions,
  isVietnameseQuestion,
  type TechnicianChatWorkOrderContext,
} from "../api/technicianChatbotApi";
import { TechnicianChatMarkdown } from "./TechnicianChatMarkdown";

type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
  error?: boolean;
};

type MascotMood = "happy" | "thinking" | "sleep";
type QuickQuestionsStatus = "idle" | "loading" | "ready" | "error";
type LookDirection = { row: 0 | 1 | 2; col: 0 | 1 | 2 };

// These are example input prompts, NOT simulated AI responses.
// Backend questions take priority when they are in English; if it only
// returns Vietnamese suggestions, preserve the English-first UI.
const ENGLISH_STARTER_QUESTIONS = [
  "How do I troubleshoot a drone that won't power on?",
  "What should I inspect after telemetry signal loss?",
  "How can I check battery health safely?",
  "What should I check before returning a drone to service?",
];

function Mascot({
  mood = "happy",
  size = 42,
  look,
}: {
  mood?: MascotMood;
  size?: number;
  look?: LookDirection;
}) {
  const reactionPositions: Record<MascotMood, string> = {
    happy: "0% 0%",
    thinking: "50% 50%",
    sleep: "0% 100%",
  };
  const image = look ? mascotDirections : mascotReactions;
  const position = look
    ? `${look.col * 50}% ${look.row * 50}%`
    : reactionPositions[mood];

  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 bg-no-repeat"
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${image})`,
        backgroundSize: "300% 300%",
        backgroundPosition: position,
      }}
    />
  );
}

/** Sprite direction follows the global pointer, relative to the robot's launcher. */
function directionToPointer(dx: number, dy: number): LookDirection {
  if (Math.hypot(dx, dy) < 22) return { row: 1, col: 1 };
  return {
    row: Math.abs(dy) < Math.abs(dx) * 0.45 ? 1 : dy < 0 ? 0 : 2,
    col: Math.abs(dx) < Math.abs(dy) * 0.45 ? 1 : dx < 0 ? 0 : 2,
  };
}

export function TechnicianAiChat({ context }: { context: TechnicianChatWorkOrderContext }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quickQuestions, setQuickQuestions] = useState<string[]>([]);
  const [quickQuestionsStatus, setQuickQuestionsStatus] = useState<QuickQuestionsStatus>("idle");
  const [look, setLook] = useState<LookDirection>({ row: 1, col: 1 });

  const nextId = useRef(1);
  const abortRef = useRef<AbortController | null>(null);
  const quickAbortRef = useRef<AbortController | null>(null);
  const quickRequestedRef = useRef(false);
  const quickLoadingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const contextRef = useRef(context);
  contextRef.current = context;

  const loadQuickQuestions = useCallback(async () => {
    if (quickLoadingRef.current) return;
    quickLoadingRef.current = true;
    quickRequestedRef.current = true;
    setQuickQuestionsStatus("loading");
    const controller = new AbortController();
    quickAbortRef.current = controller;
    try {
      const questions = await getTechnicianQuickQuestions(controller.signal);
      if (controller.signal.aborted) return;
      // This endpoint has no documented language option. Keep the initial UI
      // English and use local English prompts only if BE returned no English ones.
      setQuickQuestions(questions.filter((question) => !isVietnameseQuestion(question)).slice(0, 4));
      setQuickQuestionsStatus("ready");
    } catch (error) {
      if (controller.signal.aborted) return;
      setQuickQuestionsStatus("error");
    } finally {
      if (quickAbortRef.current === controller) quickAbortRef.current = null;
      quickLoadingRef.current = false;
    }
  }, []);

  // Only one pointer listener regardless of the number of messages/mascots.
  // The 3x3 directional sheet is already part of src/assets/mascot.
  useEffect(() => {
    let animationFrame = 0;
    let pointerX = 0;
    let pointerY = 0;
    const update = () => {
      animationFrame = 0;
      const rect = launcherRef.current?.getBoundingClientRect();
      if (!rect) return;
      const next = directionToPointer(
        pointerX - (rect.left + 28),
        pointerY - (rect.top + rect.height / 2),
      );
      setLook((previous) =>
        previous.row === next.row && previous.col === next.col ? previous : next,
      );
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!animationFrame) animationFrame = window.requestAnimationFrame(update);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  useEffect(() => () => {
    abortRef.current?.abort();
    quickAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (open && !quickRequestedRef.current) void loadQuickQuestions();
  }, [open, loadQuickQuestions]);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, sending]);

  useEffect(() => {
    if (open && !sending) inputRef.current?.focus();
  }, [open, sending]);

  async function sendQuestion(text: string) {
    const question = text.trim();
    if (!question || sending) return;
    setDraft("");
    setMessages((previous) => [...previous, { id: nextId.current++, role: "user", text: question }]);
    setSending(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const answer = await askTechnicianChatbot(question, contextRef.current, controller.signal);
      if (controller.signal.aborted) return;
      setMessages((previous) => [...previous, { id: nextId.current++, role: "assistant", text: answer }]);
    } catch (error) {
      if (controller.signal.aborted) return;
      // Keep app UI in English. Do not inject raw server exceptions as chat content.
      const status = error && typeof error === "object" && "status" in error ? String(error.status) : "";
      const detail = status ? ` (HTTP ${status})` : "";
      setMessages((previous) => [...previous, {
        id: nextId.current++,
        role: "assistant",
        error: true,
        text: `The maintenance assistant could not answer${detail}. Please try again.`,
      }]);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      if (!controller.signal.aborted) setSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendQuestion(draft);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void sendQuestion(draft);
    }
  }

  const visibleSuggestions = quickQuestions.length ? quickQuestions : ENGLISH_STARTER_QUESTIONS;

  return (
    <div className="fixed bottom-4 right-4 z-[120] sm:bottom-6 sm:right-6">
      {open && (
        <section
          role="dialog"
          aria-modal="false"
          aria-label="DroneOptAI Maintenance Assistant"
          className="mb-3 flex h-[min(670px,calc(100dvh-110px))] w-[min(440px,calc(100vw-24px))] flex-col overflow-hidden rounded-[26px] border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-[0_24px_80px_rgba(0,0,0,0.30)]"
        >
          {/* Customer-inspired header: soft surfaces, spacious text, rounded corners. */}
          <div className="flex items-center justify-between gap-3 border-b border-[var(--tech-border)] px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <Mascot look={look} size={52} />
              <div className="min-w-0">
                <h2 className="truncate text-[17px] font-semibold text-[var(--tech-text)]">DroneOptAI Maintenance AI</h2>
                <p className="truncate text-[12px] text-[var(--tech-muted)]">Maintenance support · {context.workOrderId}</p>
              </div>
            </div>
            <button type="button" aria-label="Close assistant" title="Close"
              onClick={() => setOpen(false)}
              className="shrink-0 rounded-full p-2 text-[var(--tech-muted)] hover:bg-orange-500/10 hover:text-orange-500">
              <X size={19} />
            </button>
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5" aria-live="polite">
            <div className="flex items-start gap-2.5">
              <Mascot size={37} />
              <div className="max-w-[85%] rounded-[22px] rounded-tl-md border border-[var(--tech-border)] bg-[var(--tech-surface-2)] px-4 py-3 text-[13px] leading-6 text-[var(--tech-text-secondary)]">
                Hi! I'm your DroneOptAI maintenance assistant. I can help you investigate faults and plan safe inspections for <strong className="font-semibold text-[var(--tech-text)]">{context.droneId}</strong>. What would you like to check?
              </div>
            </div>

            {messages.map((message) => (
              <div key={message.id} className={`flex items-start gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                {message.role === "assistant" && <Mascot size={32} mood={message.error ? "sleep" : "happy"} />}
                <div className={`min-w-0 max-w-[86%] rounded-[22px] px-4 py-3 text-[13px] leading-6 ${
                  message.role === "user"
                    ? "rounded-tr-md bg-orange-500 text-black"
                    : message.error
                      ? "rounded-tl-md border border-red-500/30 bg-red-500/5 text-red-500"
                      : "rounded-tl-md border border-[var(--tech-border)] bg-[var(--tech-surface-2)] text-[var(--tech-text-secondary)]"
                }`}>
                  {message.role === "assistant" && !message.error
                    ? <TechnicianChatMarkdown text={message.text} />
                    : <p className="whitespace-pre-wrap break-words">{message.text}</p>}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex items-center gap-2.5 text-[12px] text-[var(--tech-muted)]">
                <Mascot mood="thinking" size={32} />
                <LoaderCircle size={15} className="animate-spin text-orange-500" />
                Analyzing your question...
              </div>
            )}
          </div>

          {/* Quick prompts stay near the composer, like Customer Assistant. */}
          <div className="border-t border-[var(--tech-border)] px-4 pb-4 pt-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-[var(--tech-text-secondary)]">Quick questions</span>
              {quickQuestionsStatus === "loading" && <LoaderCircle size={13} className="animate-spin text-orange-500" aria-label="Loading questions" />}
              {quickQuestionsStatus === "error" && (
                <button type="button" onClick={() => void loadQuickQuestions()}
                  className="text-[11px] font-medium text-orange-500 hover:underline" title="Retry loading questions from Backend">
                  Retry suggestions
                </button>
              )}
            </div>
            <div className="mb-3 flex max-h-[90px] flex-wrap content-start gap-2 overflow-y-auto">
              {visibleSuggestions.map((question) => (
                <button key={question} type="button" disabled={sending}
                  onClick={() => void sendQuestion(question)}
                  className="max-w-full rounded-full border border-[var(--tech-border)] bg-[var(--tech-surface)] px-3 py-1.5 text-left text-[11px] leading-4 text-[var(--tech-text-secondary)] transition-colors hover:border-orange-500/50 hover:text-orange-500 disabled:opacity-40">
                  {question}
                </button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                aria-label="Ask the maintenance assistant"
                rows={2}
                maxLength={2000}
                value={draft}
                disabled={sending}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about a fault or maintenance..."
                className="tech-control min-h-[66px] max-h-28 min-w-0 flex-1 resize-none rounded-[18px] border-[var(--tech-border)] bg-[var(--tech-surface-2)] px-4 py-3 text-[13px] leading-5 text-[var(--tech-text)] placeholder:text-[var(--tech-muted)] focus:border-orange-500"
              />
              <button type="submit" disabled={!draft.trim() || sending} aria-label="Send message"
                className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[16px] bg-orange-500 text-black transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40">
                {sending ? <LoaderCircle size={19} className="animate-spin" /> : <Send size={20} />}
              </button>
            </form>
            <div className="mt-2 flex justify-between text-[10px] text-[var(--tech-muted)]">
              <span>Enter to send · Shift+Enter for a new line</span>
              <span>{draft.length}/2000</span>
            </div>
            <p className="mt-2 text-[10px] leading-4 text-[var(--tech-muted)]">
              AI guidance is advisory. Always inspect the drone before making maintenance decisions.
            </p>
          </div>
        </section>
      )}

      <button
        ref={launcherRef}
        type="button"
        aria-label={open ? "Minimize maintenance assistant" : "Open maintenance assistant"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="ml-auto flex min-h-[66px] items-center gap-2 rounded-full border border-orange-500/35 bg-[var(--tech-surface)] py-1.5 pl-2 pr-4 text-[var(--tech-text)] shadow-[0_12px_35px_rgba(0,0,0,0.22)] transition-all hover:-translate-y-0.5 hover:border-orange-500"
      >
        <Mascot look={look} size={55} />
        <span className="flex flex-col items-start leading-tight">
          <span className="text-[14px] font-semibold">Ask AI</span>
          <span className="text-[11px] text-[var(--tech-muted)]">Maintenance assistant</span>
        </span>
        <ChevronDown size={16} className={`ml-1 text-orange-500 transition-transform ${open ? "" : "rotate-180"}`} />
      </button>
    </div>
  );
}
