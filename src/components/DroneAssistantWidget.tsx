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
import { useLocation } from "react-router-dom";
import { Mascot } from "page-mascot";

import droneDirections from "../assets/mascot/delivery-drone-directions.webp";
import droneReactions from "../assets/mascot/delivery-drone-reactions.webp";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
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

const QUICK_ACTIONS = [
  "Track my delivery",
  "Payment help",
  "Create a delivery",
  "Handover instructions",
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

  const [mascotSize, setMascotSize] = useState(112);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

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
     CLEANUP
  ======================================================== */

  useEffect(() => {
    return () => {
      if (snapTimerRef.current) {
        window.clearTimeout(
          snapTimerRef.current,
        );
      }
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
     CHAT
  ======================================================== */

  function appendAssistantReply(
    userText: string,
  ) {
    setIsTyping(true);

    window.setTimeout(() => {
      const reply =
        getAssistantReply(userText);

      setMessages((previous) => [
        ...previous,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: reply,
        },
      ]);

      setIsTyping(false);
    }, 500);
  }

  function sendMessage(text: string) {
    const value = text.trim();

    if (!value || isTyping) {
      return;
    }

    setMessages((previous) => [
      ...previous,
      {
        id: `${Date.now()}-user`,
        role: "user",
        content: value,
      },
    ]);

    setInput("");
    appendAssistantReply(value);
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
                        {
                          message.content
                        }
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
                {QUICK_ACTIONS.map(
                  (action) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() =>
                        sendMessage(
                          action,
                        )
                      }
                      className="rounded-full border border-white/[0.09] bg-white/[0.02] px-3 py-1.5 text-[12px] font-medium text-white/[0.68] transition hover:border-orange-500/[0.35] hover:text-white"
                    >
                      {action}
                    </button>
                  ),
                )}
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  sendMessage(input);
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
                  placeholder="Ask about your delivery..."
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
                    isTyping
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

/* =========================================================
   DEMO CHAT REPLIES
========================================================= */

function getAssistantReply(
  text: string,
) {
  const normalized =
    text.toLowerCase();

  if (
    normalized.includes("track") ||
    normalized.includes(
      "delivery status",
    ) ||
    normalized.includes("where is")
  ) {
    return "You can track your delivery from Customer > Deliveries. Open an order to view its latest progress, hub status and estimated arrival.";
  }

  if (
    normalized.includes("payment") ||
    normalized.includes("pay")
  ) {
    return "For payment support, go to your delivery details or the payment page. Pending payments must be completed before package handover can continue.";
  }

  if (
    normalized.includes("create") ||
    normalized.includes(
      "new delivery",
    )
  ) {
    return "To create a new delivery, open Customer > Create delivery. You will fill in sender, recipient, package details, route and schedule.";
  }

  if (
    normalized.includes(
      "handover",
    ) ||
    normalized.includes(
      "bring package",
    ) ||
    normalized.includes(
      "origin hub",
    )
  ) {
    return "After payment is confirmed, please bring your package to the selected origin hub before the handover deadline shown in your order.";
  }

  return "I can help with delivery tracking, payment, package handover and creating a delivery. Try one of the quick actions below.";
}
