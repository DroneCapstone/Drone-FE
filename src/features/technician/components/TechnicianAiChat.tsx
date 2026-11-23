import { type FormEvent, type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, LoaderCircle, MessageCircle, Send, X } from "lucide-react";
import mascotReactions from "../../../assets/mascot/delivery-drone-reactions.webp";
import {
  askTechnicianChatbot,
  getTechnicianQuickQuestions,
  type TechnicianChatWorkOrderContext,
} from "../api/technicianChatbotApi";

type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
  error?: boolean;
};

type MascotMood = "happy" | "thinking" | "sleep";

type QuickQuestionsStatus = "idle" | "loading" | "ready" | "error";

function Mascot({ mood = "happy", size = 40 }: { mood?: MascotMood; size?: number }) {
  // delivery-drone-reactions.webp is the existing 3x3 mascot sprite sheet.
  const positions: Record<MascotMood, string> = {
    happy: "0% 0%",
    thinking: "50% 50%",
    sleep: "0% 100%",
  };
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 bg-no-repeat"
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${mascotReactions})`,
        backgroundSize: "300% 300%",
        backgroundPosition: positions[mood],
      }}
    />
  );
}

export function TechnicianAiChat({ context }: { context: TechnicianChatWorkOrderContext }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quickQuestions, setQuickQuestions] = useState<string[]>([]);
  const [quickQuestionsStatus, setQuickQuestionsStatus] = useState<QuickQuestionsStatus>("idle");
  const [quickQuestionsError, setQuickQuestionsError] = useState("");

  const nextId = useRef(1);
  const abortRef = useRef<AbortController | null>(null);
  const quickAbortRef = useRef<AbortController | null>(null);
  const quickRequestedRef = useRef(false);
  const quickLoadingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const contextRef = useRef(context);
  contextRef.current = context;

  const loadQuickQuestions = useCallback(async () => {
    if (quickLoadingRef.current) return;
    quickLoadingRef.current = true;
    quickRequestedRef.current = true;
    setQuickQuestionsStatus("loading");
    setQuickQuestionsError("");
    const controller = new AbortController();
    quickAbortRef.current = controller;
    try {
      const questions = await getTechnicianQuickQuestions(controller.signal);
      if (controller.signal.aborted) return;
      setQuickQuestions(questions);
      setQuickQuestionsStatus("ready");
    } catch (error) {
      if (controller.signal.aborted) return;
      setQuickQuestionsError(error instanceof Error ? error.message : "Không tải được câu hỏi gợi ý.");
      setQuickQuestionsStatus("error");
    } finally {
      if (quickAbortRef.current === controller) quickAbortRef.current = null;
      quickLoadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      quickAbortRef.current?.abort();
    };
  }, []);

  // Request the real Backend suggestions only when Technician first opens chat.
  useEffect(() => {
    if (open && !quickRequestedRef.current) void loadQuickQuestions();
  }, [open, loadQuickQuestions]);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, sending, quickQuestionsStatus]);

  useEffect(() => {
    if (open && !sending) inputRef.current?.focus();
  }, [open, sending]);

  async function sendQuestion(text: string) {
    const question = text.trim();
    if (!question || sending) return;
    setDraft("");
    setMessages((current) => [...current, { id: nextId.current++, role: "user", text: question }]);
    setSending(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const reply = await askTechnicianChatbot(question, contextRef.current, controller.signal);
      if (controller.signal.aborted) return;
      setMessages((current) => [...current, { id: nextId.current++, role: "assistant", text: reply }]);
    } catch (error) {
      if (controller.signal.aborted) return;
      setMessages((current) => [...current, {
        id: nextId.current++,
        role: "assistant",
        error: true,
        text: error instanceof Error ? error.message : "Không thể gửi câu hỏi đến AI. Vui lòng thử lại.",
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

  return (
    <div className="fixed bottom-4 right-4 z-[120] sm:bottom-6 sm:right-6">
      {open && (
        <section
          role="dialog"
          aria-modal="false"
          aria-label="DroneOptAI Maintenance AI Assistant"
          className="mb-3 flex h-[min(620px,calc(100dvh-115px))] w-[min(420px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-[0_22px_75px_rgba(0,0,0,0.50)]"
        >
          <div className="flex items-center justify-between border-b border-[var(--tech-border)] bg-[var(--tech-surface-2)] px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Mascot size={47} mood={sending ? "thinking" : "happy"} />
              <div className="min-w-0">
                <h2 className="truncate text-[14px] font-semibold text-[var(--tech-text)]">DroneOptAI Maintenance AI</h2>
                <p className="truncate text-[11px] text-[var(--tech-muted)]">Tư vấn sự cố · {context.workOrderId}</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Đóng chatbot"
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 text-[var(--tech-muted)] hover:bg-orange-500/10 hover:text-orange-500"
            >
              <X size={17} />
            </button>
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            <div className="flex items-start gap-2.5">
              <Mascot size={37} />
              <div className="max-w-[85%] rounded-xl rounded-tl-sm bg-[var(--tech-surface-2)] px-3.5 py-3 text-[13px] leading-6 text-[var(--tech-text-secondary)]">
                Xin chào! Mình có thể hỗ trợ phân tích sự cố và gợi ý quy trình kiểm tra cho <strong>{context.droneId}</strong>. Bạn muốn kiểm tra vấn đề gì?
              </div>
            </div>
            {messages.length === 0 && (
              <div className="space-y-2 pl-1">
                <p className="text-[11px] font-medium text-[var(--tech-muted)]">Câu hỏi gợi ý</p>
                {quickQuestionsStatus === "loading" && (
                  <div className="flex items-center gap-2 text-[12px] text-[var(--tech-muted)]">
                    <LoaderCircle size={14} className="animate-spin text-orange-500" /> Đang tải câu hỏi từ Backend...
                  </div>
                )}
                {quickQuestionsStatus === "error" && (
                  <div className="rounded-lg border border-red-500/25 px-3 py-2 text-[12px] leading-5 text-red-400">
                    {quickQuestionsError}
                    <button type="button" onClick={() => void loadQuickQuestions()} className="ml-2 font-semibold underline hover:text-orange-500">Retry</button>
                  </div>
                )}
                {quickQuestionsStatus === "ready" && quickQuestions.length === 0 && (
                  <p className="text-[12px] text-[var(--tech-muted)]">Backend chưa cung cấp câu hỏi gợi ý.</p>
                )}
                {quickQuestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={sending}
                    onClick={() => void sendQuestion(suggestion)}
                    className="block w-full rounded-lg border border-[var(--tech-border)] px-3 py-2 text-left text-[12px] leading-5 text-[var(--tech-text-secondary)] hover:border-orange-500/40 hover:text-orange-500 disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            {messages.map((message) => (
              <div key={message.id} className={`flex items-start gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                {message.role === "assistant" && <Mascot size={30} mood={message.error ? "sleep" : "happy"} />}
                <p className={`max-w-[86%] whitespace-pre-wrap break-words rounded-xl px-3.5 py-2.5 text-[13px] leading-6 ${
                  message.role === "user"
                    ? "rounded-tr-sm bg-orange-500 text-black"
                    : message.error
                      ? "rounded-tl-sm border border-red-500/30 bg-red-500/5 text-red-400"
                      : "rounded-tl-sm bg-[var(--tech-surface-2)] text-[var(--tech-text-secondary)]"
                }`}>{message.text}</p>
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-[12px] text-[var(--tech-muted)]">
                <Mascot size={30} mood="thinking" />
                <LoaderCircle size={14} className="animate-spin text-orange-500" /> AI đang phân tích...
              </div>
            )}
          </div>

          <div className="border-t border-[var(--tech-border)] p-3">
            <p className="mb-2 text-[11px] leading-4 text-[var(--tech-muted)]">
              AI chỉ hỗ trợ tham khảo. Technician phải kiểm tra thực tế trước khi quyết định bảo trì.
            </p>
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                aria-label="Nhập câu hỏi cho trợ lý AI"
                rows={2}
                maxLength={2000}
                value={draft}
                disabled={sending}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Hỏi AI về sự cố hoặc bảo trì..."
                className="tech-control min-h-[60px] max-h-28 min-w-0 flex-1 resize-none rounded-lg px-3 py-2.5 text-[13px] leading-5"
              />
              <button
                type="submit"
                disabled={!draft.trim() || sending}
                aria-label="Gửi câu hỏi"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-black hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sending ? <LoaderCircle size={17} className="animate-spin" /> : <Send size={17} />}
              </button>
            </form>
            <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--tech-subtle)]">
              <span>Enter để gửi · Shift+Enter xuống dòng</span>
              <span>{draft.length}/2000</span>
            </div>
          </div>
        </section>
      )}

      <button
        type="button"
        aria-label={open ? "Thu gọn trợ lý AI" : "Mở trợ lý AI bảo trì"}
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
        className="ml-auto flex h-[62px] items-center gap-1 rounded-full border border-orange-500/40 bg-[var(--tech-surface)] pl-1.5 pr-4 text-[var(--tech-text)] shadow-[0_12px_36px_rgba(0,0,0,0.4)] transition-transform hover:-translate-y-0.5 hover:border-orange-500"
      >
        <Mascot size={51} mood={sending ? "thinking" : "happy"} />
        <span className="flex flex-col items-start leading-tight">
          <span className="text-[13px] font-semibold">Ask AI</span>
          <span className="text-[10px] text-[var(--tech-muted)]">Maintenance assistant</span>
        </span>
        {open ? <ChevronDown size={15} className="ml-1 text-orange-500" /> : <MessageCircle size={15} className="ml-1 text-orange-500" />}
      </button>
    </div>
  );
}
