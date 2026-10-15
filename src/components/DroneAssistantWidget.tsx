import {
  ChevronDown,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Mascot } from "page-mascot";
import droneDirections from "../assets/mascot/delivery-drone-directions.webp";
import droneReactions from "../assets/mascot/delivery-drone-reactions.webp";
import {
  CustomerChatbotApiError,
  getCustomerQuickQuestions,
  getStoredConversationId,
  saveCreateDeliveryPrefill,
  sendCustomerChatMessage,
  storeConversationId,
} from "../features/customer/chatbot/customerChatbotService";
import type {
  CustomerChatbotAction,
  QuickQuestion,
} from "../features/customer/chatbot/customerChatbot.types";
import { CustomerChatMarkdown } from "../features/customer/chatbot/CustomerChatMarkdown";
type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  actions?: CustomerChatbotAction[];
};
type Position = {
  x: number;
  y: number;
};
type Size = {
  width: number;
  height: number;
};
type PointerStart = {
  pointerId: number;
  clientX: number;
  clientY: number;
  originX: number;
  originY: number;
  moved: boolean;
};
const FALLBACK_QUICK_QUESTIONS: QuickQuestion[] = [
  {
    id: "track_delivery",
    title: "Track my delivery",
    prompt: "Track my latest delivery",
  },
  {
    id: "payment_help",
    title: "Payment help",
    prompt: "Help me with payment for my delivery",
  },
  {
    id: "create_delivery",
    title: "Create a delivery",
    prompt: "How do I create a delivery?",
  },
  {
    id: "handover",
    title: "Handover instructions",
    prompt: "Explain package handover instructions",
  },
];
const POSITION_STORAGE_KEY =
  "droneoptai-customer-assistant-position";
const EDGE_GAP = 12;
const CHAT_GAP = 10;
const DRAG_THRESHOLD = 6;
const SNAP_DURATION = 220;
/* =========================================================
   DRONEOPT AI ASSISTANT
   Behavior:
   - Starts bottom-right
   - Drag freely while holding
   - On release, snaps to nearest left/right screen edge
   - Chat panel follows mascot
   - Position persists in localStorage
========================================================= */
export function DroneAssistantWidget() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [mascotSize, setMascotSize] = useState(112);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [quickQuestions, setQuickQuestions] = useState<QuickQuestion[]>([]);
  const [quickQuestionsLoaded, setQuickQuestionsLoaded] = useState(false);
  const [conversationId, setConversationId] = useState(() =>
    getStoredConversationId(),
  );
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [position, setPosition] =
    useState<Position | null>(null);
  const [isDragging, setIsDragging] =
    useState(false);
  const [isSnapping, setIsSnapping] =
    useState(false);
  const [chatSize, setChatSize] = useState<Size>({
    width: 360,
    height: 500,
  });
  const [messages, setMessages] =
    useState<ChatMessage[]>([
      {
        id: "welcome-1",
        role: "assistant",
        content:
          "Hi, I’m DroneOptAI assistant. I can help you with deliveries, payment and package handover.",
      },
    ]);
  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);
  const chatPanelRef =
    useRef<HTMLDivElement | null>(null);
  const pointerStartRef =
    useRef<PointerStart | null>(null);
  // Prevent a drag release from being interpreted as a mascot click.
  // A normal tap is allowed to reach <Mascot />, so page-mascot
  // can still play its reaction animation.
  const suppressNextClickRef = useRef(false);
  const snapTimerRef =
    useRef<number | null>(null);
  const chatRequestAbortRef =
    useRef<AbortController | null>(null);
  /* =======================================================
     RESPONSIVE SIZE
  ======================================================== */
  useEffect(() => {
    const media = window.matchMedia(
      "(max-width: 640px)",
    );
    const updateSize = () => {
      setMascotSize(media.matches ? 88 : 108);
    };
    updateSize();
    media.addEventListener("change", updateSize);
    return () => {
      media.removeEventListener(
        "change",
        updateSize,
      );
    };
  }, []);
  /* =======================================================
     INITIAL POSITION
  ======================================================== */
  useEffect(() => {
    const defaultPosition =
      getDefaultPosition(mascotSize);
    try {
      const saved =
        window.localStorage.getItem(
          POSITION_STORAGE_KEY,
        );
      if (!saved) {
        setPosition(defaultPosition);
        return;
      }
      const parsed = JSON.parse(saved);
      if (
        typeof parsed?.x !== "number" ||
        typeof parsed?.y !== "number"
      ) {
        setPosition(defaultPosition);
        return;
      }
      const safePosition = clampPosition(
        {
          x: parsed.x,
          y: parsed.y,
        },
        mascotSize,
      );
      setPosition(
        snapToNearestEdge(
          safePosition,
          mascotSize,
        ),
      );
    } catch {
      setPosition(defaultPosition);
    }
  }, [mascotSize]);
  /* =======================================================
     KEEP INSIDE VIEWPORT
  ======================================================== */
  useEffect(() => {
    function handleResize() {
      setPosition((current) => {
        if (!current) {
          return getDefaultPosition(
            mascotSize,
          );
        }
        const safe = clampPosition(
          current,
          mascotSize,
        );
        return snapToNearestEdge(
          safe,
          mascotSize,
        );
      });
    }
    window.addEventListener(
      "resize",
      handleResize,
    );
    return () => {
      window.removeEventListener(
        "resize",
        handleResize,
      );
    };
  }, [mascotSize]);
  /* =======================================================
     CHAT PANEL SIZE
  ======================================================== */
  useLayoutEffect(() => {
    if (!open || !chatPanelRef.current) {
      return;
    }
    const element = chatPanelRef.current;
    const updateSize = () => {
      const rect =
        element.getBoundingClientRect();
      setChatSize({
        width: rect.width,
        height: rect.height,
      });
    };
    updateSize();
    const observer = new ResizeObserver(
      updateSize,
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [open]);
  /* =======================================================
     AUTO SCROLL
  ======================================================== */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isTyping]);
  /* =======================================================
     CHATBOT QUICK QUESTIONS
  ======================================================== */
  useEffect(() => {
    if (!open || quickQuestionsLoaded) {
      return;
    }
    const controller = new AbortController();
    getCustomerQuickQuestions(controller.signal)
      .then((questions) => {
        setQuickQuestions(questions);
      })
      .catch((error) => {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }
        console.error(
          "[DroneAssistantWidget] Failed to load quick questions:",
          error,
        );
      })
      .finally(() => {
        setQuickQuestionsLoaded(true);
      });
    return () => {
      controller.abort();
    };
  }, [open, quickQuestionsLoaded]);
  /* =======================================================
     RATE LIMIT COUNTDOWN
  ======================================================== */
  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setCooldownSeconds((current) =>
        Math.max(0, current - 1),
      );
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [cooldownSeconds]);
  /* =======================================================
     CLEANUP
  ======================================================== */
  useEffect(() => {
    return () => {
      if (snapTimerRef.current) {
        window.clearTimeout(
          snapTimerRef.current,
        );
      }
      chatRequestAbortRef.current?.abort();
    };
  }, []);
  /* =======================================================
     ROUTE VISIBILITY
  ======================================================== */
  const shouldShow = useMemo(() => {
    return (
      pathname === "/" ||
      pathname.startsWith("/customer")
    );
  }, [pathname]);
  if (!shouldShow) {
    return null;
  }
  /* =======================================================
     POSITION STORAGE
  ======================================================== */
  function savePosition(next: Position) {
    try {
      window.localStorage.setItem(
        POSITION_STORAGE_KEY,
        JSON.stringify(next),
      );
    } catch {
      // Ignore storage errors.
    }
  }
  /* =======================================================
     SNAP ANIMATION
  ======================================================== */
  function animateSnap(next: Position) {
    if (snapTimerRef.current) {
      window.clearTimeout(
        snapTimerRef.current,
      );
    }
    setIsSnapping(true);
    setPosition(next);
    savePosition(next);
    snapTimerRef.current =
      window.setTimeout(() => {
        setIsSnapping(false);
      }, SNAP_DURATION);
  }
  /* =======================================================
     DRAG
  ======================================================== */
  function handlePointerDown(
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    if (!position) {
      return;
    }
    pointerStartRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      originX: position.x,
      originY: position.y,
      moved: false,
    };
    setIsSnapping(false);
    setIsDragging(true);
  }
  function handlePointerMove(
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    const start = pointerStartRef.current;
    if (
      !start ||
      start.pointerId !== event.pointerId
    ) {
      return;
    }
    const deltaX =
      event.clientX - start.clientX;
    const deltaY =
      event.clientY - start.clientY;
    const distance = Math.hypot(
      deltaX,
      deltaY,
    );
    if (
      distance >= DRAG_THRESHOLD &&
      !start.moved
    ) {
      start.moved = true;
      // Capture only after we know this is a drag.
      // Normal taps stay targeted at <Mascot />, preserving reactions.
      try {
        event.currentTarget.setPointerCapture(
          event.pointerId,
        );
      } catch {
        // Ignore pointer capture errors.
      }
    }
    if (!start.moved) {
      return;
    }
    setPosition(
      clampPosition(
        {
          x: start.originX + deltaX,
          y: start.originY + deltaY,
        },
        mascotSize,
      ),
    );
  }
  function handlePointerUp(
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    const start = pointerStartRef.current;
    if (
      !start ||
      start.pointerId !== event.pointerId
    ) {
      return;
    }
    try {
      if (
        event.currentTarget.hasPointerCapture(
          event.pointerId,
        )
      ) {
        event.currentTarget.releasePointerCapture(
          event.pointerId,
        );
      }
    } catch {
      // Pointer may already be released.
    }
    if (start.moved) {
      const current =
        position ??
        getDefaultPosition(mascotSize);
      const snapped =
        snapToNearestEdge(
          current,
          mascotSize,
        );
      suppressNextClickRef.current = true;
      animateSnap(snapped);
    }
    pointerStartRef.current = null;
    setIsDragging(false);
  }
  function handlePointerCancel() {
    pointerStartRef.current = null;
    setIsDragging(false);
    if (position) {
      animateSnap(
        snapToNearestEdge(
          position,
          mascotSize,
        ),
      );
    }
  }
  function handleMascotClickCapture(
    event: React.MouseEvent<HTMLDivElement>,
  ) {
    if (!suppressNextClickRef.current) {
      return;
    }
    // A completed drag may emit a click. Stop it before page-mascot
    // can interpret it as a reaction.
    event.preventDefault();
    event.stopPropagation();
    suppressNextClickRef.current = false;
  }
  function handleMascotClick() {
    // page-mascot receives the click first, then it bubbles here.
    // Result: one tap shows a reaction and opens/closes the chat.
    setOpen((previous) => !previous);
  }
  /* =======================================================
     CHAT — BACKEND API v1.1
  ======================================================== */
  async function sendMessage(text: string) {
    const value = text.trim();
    if (
      !value ||
      isTyping ||
      cooldownSeconds > 0
    ) {
      return;
    }
    const history = messages
      .filter((message) => message.id !== "welcome-1")
      .slice(-10)
      .map((message) => ({
        role: message.role === "assistant" ? "model" as const : "user" as const,
        content: message.content,
      }));
    setMessages((previous) => [
      ...previous,
      {
        id: `${Date.now()}-user`,
        role: "user",
        content: value,
      },
    ]);
    setInput("");
    setIsTyping(true);
    chatRequestAbortRef.current?.abort();
    const controller = new AbortController();
    chatRequestAbortRef.current = controller;
    try {
      const response = await sendCustomerChatMessage(
        {
          message: value,
          conversation_id: conversationId || null,
          history,
        },
        controller.signal,
      );
      if (response.conversation_id) {
        setConversationId(response.conversation_id);
        storeConversationId(response.conversation_id);
      }
      setMessages((previous) => [
        ...previous,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content:
            response.reply ||
            "DroneOptAI Assistant did not return a reply.",
          actions: response.actions,
        },
      ]);
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }
      if (error instanceof CustomerChatbotApiError) {
        if (
          error.status === 429 ||
          error.code === "CHAT_RATE_LIMITED"
        ) {
          const retrySeconds = Math.max(
            1,
            error.retryAfterSeconds ?? 30,
          );
          setCooldownSeconds(retrySeconds);
          setMessages((previous) => [
            ...previous,
            {
              id: `${Date.now()}-assistant-error`,
              role: "assistant",
              content:
                error.message ||
                `The assistant is busy. Please try again in ${retrySeconds} seconds.`,
            },
          ]);
          return;
        }
        setMessages((previous) => [
          ...previous,
          {
            id: `${Date.now()}-assistant-error`,
            role: "assistant",
            content:
              error.message ||
              "I could not connect to DroneOptAI services. Please try again.",
          },
        ]);
        return;
      }
      console.error(
        "[DroneAssistantWidget] Chat request failed:",
        error,
      );
      setMessages((previous) => [
        ...previous,
        {
          id: `${Date.now()}-assistant-error`,
          role: "assistant",
          content:
            "I could not connect to DroneOptAI services. Please try again.",
        },
      ]);
    } finally {
      if (chatRequestAbortRef.current === controller) {
        chatRequestAbortRef.current = null;
      }
      setIsTyping(false);
    }
  }
  function handleAssistantAction(
    action: CustomerChatbotAction,
  ) {
    const payload = action.payload ?? {};
    if (action.type === "CREATE_DELIVERY") {
      saveCreateDeliveryPrefill(action.payload);
      setOpen(false);
      navigate(
        "/customer/deliveries/create?new=1&from=chatbot",
      );
      return;
    }
    if (action.type === "OPEN_PRICING") {
      setOpen(false);
      navigate("/customer/pricing");
      return;
    }
    if (action.type === "OPEN_NOTIFICATIONS") {
      setOpen(false);
      navigate("/customer/notifications");
      return;
    }
    if (action.type === "LOGIN_REQUIRED") {
      setOpen(false);
      navigate("/login");
      return;
    }
    const orderId =
      readActionValue(payload, "order_id") ||
      readActionValue(payload, "order_code") ||
      getLastPathSegment(action.href);
    if (action.type === "OPEN_ORDER_TRACKING" && orderId) {
      setOpen(false);
      navigate(
        `/customer/deliveries/${encodeURIComponent(orderId)}`,
      );
      return;
    }
    if (action.type === "OPEN_PAYMENT" && orderId) {
      setOpen(false);
      navigate(
        `/customer/payment/${encodeURIComponent(orderId)}`,
      );
      return;
    }
    if (action.href) {
      if (/^https?:\/\//i.test(action.href)) {
        window.open(
          action.href,
          "_blank",
          "noopener,noreferrer",
        );
      } else {
        setOpen(false);
        navigate(action.href);
      }
    }
  }
  /* =======================================================
     CHAT POSITION
  ======================================================== */
  const chatPosition =
    position && open
      ? getChatPosition(
          position,
          mascotSize,
          chatSize,
        )
      : null;
  return (
    <>
      {/* =====================================================
          CHAT PANEL
      ====================================================== */}
      {open &&
        position &&
        chatPosition && (
          <div
            ref={chatPanelRef}
            className="
              fixed
              z-[96]
              w-[calc(100vw-24px)]
              max-w-[360px]
              overflow-hidden
              rounded-2xl
              border
              border-white/[0.10]
              bg-[#161217]
              shadow-[0_18px_40px_rgba(0,0,0,0.32)]
              backdrop-blur-md
            "
            style={{
              left: chatPosition.x,
              top: chatPosition.y,
              transition:
                isSnapping &&
                !isDragging
                  ? `left ${SNAP_DURATION}ms ease-out, top ${SNAP_DURATION}ms ease-out`
                  : "none",
            }}
          >
            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500/[0.10] text-orange-400">
                    <Sparkles size={14} />
                  </div>
                  <p className="truncate text-[14px] font-semibold text-white">
                    DroneOptAI Assistant
                  </p>
                </div>
                <p className="mt-1 text-[12px] text-white/[0.42]">
                  Delivery support · Customer workspace
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setOpen(false)
                  }
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/[0.42] transition hover:bg-white/[0.04] hover:text-white"
                  aria-label="Minimize assistant"
                >
                  <ChevronDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setOpen(false)
                  }
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/[0.42] transition hover:bg-white/[0.04] hover:text-white"
                  aria-label="Close assistant"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            {/* MESSAGES */}
            <div className="max-h-[300px] overflow-y-auto px-4 py-4">
              <div className="space-y-3">
                {messages.map(
                  (message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.role ===
                        "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-6 ${
                          message.role ===
                          "user"
                            ? "bg-orange-500 text-black"
                            : "border border-white/[0.08] bg-white/[0.03] text-white/[0.86]"
                        }`}
                      >
                        {message.role === "assistant" ? (
                          <CustomerChatMarkdown content={message.content} />
                        ) : (
                          message.content
                        )}
                        {message.role === "assistant" &&
                          message.actions &&
                          message.actions.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-2 border-t border-white/[0.07] pt-2.5">
                              {message.actions.map((action, index) => (
                                <button
                                  key={`${action.type}-${index}`}
                                  type="button"
                                  onClick={() =>
                                    handleAssistantAction(action)
                                  }
                                  className="rounded-full border border-orange-500/[0.25] bg-orange-500/[0.08] px-2.5 py-1 text-[11px] font-medium text-orange-300 transition hover:bg-orange-500/[0.14]"
                                >
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          )}
                      </div>
                    </div>
                  ),
                )}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="inline-flex items-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/[0.55]" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/[0.40] [animation-delay:120ms]" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/[0.30] [animation-delay:240ms]" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
            {/* QUICK ACTIONS + INPUT */}
            <div className="border-t border-white/[0.08] px-4 py-3">
              <div className="mb-3 flex flex-wrap gap-2">
                {(quickQuestions.length > 0
                  ? quickQuestions
                  : FALLBACK_QUICK_QUESTIONS
                ).map((question) => (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() =>
                      void sendMessage(question.prompt)
                    }
                    disabled={
                      isTyping ||
                      cooldownSeconds > 0
                    }
                    className="rounded-full border border-white/[0.09] bg-white/[0.02] px-3 py-1.5 text-[12px] font-medium text-white/[0.68] transition hover:border-orange-500/[0.35] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {question.title}
                  </button>
                ))}
              </div>
              {cooldownSeconds > 0 && (
                <p className="mb-2 text-[11px] text-amber-300/[0.82]">
                  Assistant is busy. Try again in {cooldownSeconds}s.
                </p>
              )}
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendMessage(input);
                }}
                className="flex items-end gap-2"
              >
                <textarea
                  value={input}
                  onChange={(event) =>
                    setInput(
                      event.target.value,
                    )
                  }
                  rows={1}
                  placeholder={
                    cooldownSeconds > 0
                      ? `Try again in ${cooldownSeconds}s`
                      : "Ask about your delivery..."
                  }
                  disabled={
                    isTyping ||
                    cooldownSeconds > 0
                  }
                  className="
                    max-h-[120px]
                    min-h-[44px]
                    flex-1
                    resize-none
                    rounded-xl
                    border
                    border-white/[0.10]
                    bg-[#120f14]
                    px-3.5
                    py-3
                    text-[13px]
                    text-white
                    outline-none
                    transition
                    placeholder:text-white/[0.24]
                    focus:border-orange-500/[0.45]
                  "
                />
                <button
                  type="submit"
                  disabled={
                    !input.trim() ||
                    isTyping ||
                    cooldownSeconds > 0
                  }
                  className="
                    inline-flex
                    h-11
                    w-11
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-orange-500
                    text-black
                    transition
                    hover:bg-orange-400
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                  aria-label="Send message"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>
        )}
      {/* =====================================================
          MASCOT
      ====================================================== */}
      <div
        onClickCapture={
          handleMascotClickCapture
        }
        onClick={handleMascotClick}
        onPointerDown={
          handlePointerDown
        }
        onPointerMove={
          handlePointerMove
        }
        onPointerUp={handlePointerUp}
        onPointerCancel={
          handlePointerCancel
        }
        className={`
          fixed
          z-[97]
          select-none
          bg-transparent
          p-0
          outline-none
          ${
            isDragging
              ? "cursor-grabbing"
              : "cursor-grab"
          }
        `}
        style={
          position
            ? {
                left: position.x,
                top: position.y,
                width: mascotSize,
                height: mascotSize,
                touchAction: "none",
                userSelect: "none",
                WebkitUserSelect:
                  "none",
                transition:
                  isSnapping &&
                  !isDragging
                    ? `left ${SNAP_DURATION}ms ease-out, top ${SNAP_DURATION}ms ease-out`
                    : "none",
              }
            : {
                right: EDGE_GAP,
                bottom: EDGE_GAP,
                width: mascotSize,
                height: mascotSize,
                touchAction: "none",
              }
        }
        title="Tap to chat · Drag to move"
      >
        <div
          className={`
            h-full
            w-full
            origin-center
            drop-shadow-[0_12px_22px_rgba(0,0,0,0.38)]
            transition-transform
            duration-150
            ${
              isDragging
                ? "scale-[1.04]"
                : "hover:scale-[1.03]"
            }
          `}
        >
          <Mascot
            directions={
              droneDirections
            }
            reactions={
              droneReactions
            }
            size={mascotSize}
            label="DroneOptAI assistant"
          />
        </div>
      </div>
    </>
  );
}
/* =========================================================
   MASCOT POSITION HELPERS
========================================================= */
function getDefaultPosition(
  mascotSize: number,
): Position {
  return {
    x:
      window.innerWidth -
      mascotSize -
      EDGE_GAP,
    y:
      window.innerHeight -
      mascotSize -
      EDGE_GAP,
  };
}
function clampPosition(
  position: Position,
  mascotSize: number,
): Position {
  const maxX = Math.max(
    EDGE_GAP,
    window.innerWidth -
      mascotSize -
      EDGE_GAP,
  );
  const maxY = Math.max(
    EDGE_GAP,
    window.innerHeight -
      mascotSize -
      EDGE_GAP,
  );
  return {
    x: Math.min(
      Math.max(
        position.x,
        EDGE_GAP,
      ),
      maxX,
    ),
    y: Math.min(
      Math.max(
        position.y,
        EDGE_GAP,
      ),
      maxY,
    ),
  };
}
/* =========================================================
   ASSISTIVE-TOUCH STYLE SNAP
   Mascot always docks to the nearest LEFT or RIGHT edge.
   Vertical position is preserved.
========================================================= */
function snapToNearestEdge(
  position: Position,
  mascotSize: number,
): Position {
  const safe = clampPosition(
    position,
    mascotSize,
  );
  const mascotCenterX =
    safe.x + mascotSize / 2;
  const screenCenterX =
    window.innerWidth / 2;
  const x =
    mascotCenterX <= screenCenterX
      ? EDGE_GAP
      : window.innerWidth -
        mascotSize -
        EDGE_GAP;
  return {
    x,
    y: safe.y,
  };
}
/* =========================================================
   CHAT POSITION
   - Follows mascot
   - Right-side mascot -> panel extends to the left
   - Left-side mascot -> panel extends to the right
   - Prefers above mascot
   - Falls below if there is not enough room
========================================================= */
function getChatPosition(
  mascotPosition: Position,
  mascotSize: number,
  chatSize: Size,
): Position {
  const viewportWidth =
    window.innerWidth;
  const viewportHeight =
    window.innerHeight;
  const mascotCenterX =
    mascotPosition.x +
    mascotSize / 2;
  const mascotOnRight =
    mascotCenterX >
    viewportWidth / 2;
  let x = mascotOnRight
    ? mascotPosition.x +
      mascotSize -
      chatSize.width
    : mascotPosition.x;
  x = Math.min(
    Math.max(x, EDGE_GAP),
    Math.max(
      EDGE_GAP,
      viewportWidth -
        chatSize.width -
        EDGE_GAP,
    ),
  );
  const aboveY =
    mascotPosition.y -
    chatSize.height -
    CHAT_GAP;
  const belowY =
    mascotPosition.y +
    mascotSize +
    CHAT_GAP;
  let y: number;
  if (aboveY >= EDGE_GAP) {
    y = aboveY;
  } else if (
    belowY +
      chatSize.height <=
    viewportHeight -
      EDGE_GAP
  ) {
    y = belowY;
  } else {
    y = Math.min(
      Math.max(
        EDGE_GAP,
        mascotPosition.y -
          chatSize.height / 2 +
          mascotSize / 2,
      ),
      Math.max(
        EDGE_GAP,
        viewportHeight -
          chatSize.height -
          EDGE_GAP,
      ),
    );
  }
  return {
    x,
    y,
  };
}
function readActionValue(
  payload: Record<string, unknown>,
  key: string,
) {
  const value = payload[key];
  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value);
  }
  return "";
}
function getLastPathSegment(
  href?: string | null,
) {
  if (!href) {
    return "";
  }
  const segments = href
    .split("/")
    .filter(Boolean);
  return segments[segments.length - 1] ?? "";
}
