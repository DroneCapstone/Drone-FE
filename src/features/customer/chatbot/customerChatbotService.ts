import { ApiError, apiRequest } from "../services/customerApi";
import type {
  CustomerChatbotRequest,
  CustomerChatbotResponse,
  QuickQuestion,
  QuickQuestionsResponse,
} from "./customerChatbot.types";

const CHAT_PATH = "/api/v1/customer/chatbot/chat";
const QUICK_QUESTIONS_PATH =
  "/api/v1/customer/chatbot/quick-questions";

const CHAT_CONVERSATION_KEY =
  "droneoptai.customer.chatbot.conversation-id";

const CREATE_DELIVERY_PREFILL_KEY =
  "droneoptai.customer.chatbot.create-delivery-prefill";

type ErrorPayload = {
  code?: string;
  message?: string;
  detail?: unknown;
  retry_after_seconds?: number;
};

export class CustomerChatbotApiError extends Error {
  status: number;
  code?: string;
  retryAfterSeconds?: number;

  constructor(
    message: string,
    options: {
      status: number;
      code?: string;
      retryAfterSeconds?: number;
    },
  ) {
    super(message);
    this.name = "CustomerChatbotApiError";
    this.status = options.status;
    this.code = options.code;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

function asErrorPayload(value: unknown): ErrorPayload {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value as ErrorPayload;
}

function normalizeApiError(error: unknown) {
  if (!(error instanceof ApiError)) {
    return error;
  }

  const payload = asErrorPayload(error.data);

  return new CustomerChatbotApiError(error.message, {
    status: error.status,
    code:
      typeof payload.code === "string"
        ? payload.code
        : undefined,
    retryAfterSeconds:
      typeof payload.retry_after_seconds === "number"
        ? payload.retry_after_seconds
        : undefined,
  });
}

export async function sendCustomerChatMessage(
  request: CustomerChatbotRequest,
  signal?: AbortSignal,
): Promise<CustomerChatbotResponse> {
  try {
    const response = await apiRequest<CustomerChatbotResponse>(
      CHAT_PATH,
      {
        method: "POST",
        signal,
        body: JSON.stringify({
          message: request.message.trim(),
          conversation_id: request.conversation_id ?? null,
          history: (request.history ?? []).slice(-10),
        }),
      },
    );

    return {
      conversation_id: response.conversation_id ?? "",
      reply: response.reply ?? "",
      tools_called: Array.isArray(response.tools_called)
        ? response.tools_called
        : [],
      data: response.data ?? null,
      actions: Array.isArray(response.actions)
        ? response.actions
        : [],
      meta: response.meta ?? null,
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function getCustomerQuickQuestions(
  signal?: AbortSignal,
): Promise<QuickQuestion[]> {
  try {
    const response = await apiRequest<QuickQuestionsResponse>(
      QUICK_QUESTIONS_PATH,
      {
        method: "GET",
        signal,
      },
    );

    return Array.isArray(response.questions)
      ? response.questions
      : [];
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export function getStoredConversationId() {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    window.sessionStorage.getItem(
      CHAT_CONVERSATION_KEY,
    ) ?? ""
  );
}

export function storeConversationId(
  conversationId: string,
) {
  if (
    typeof window === "undefined" ||
    !conversationId
  ) {
    return;
  }

  window.sessionStorage.setItem(
    CHAT_CONVERSATION_KEY,
    conversationId,
  );
}

export function clearStoredConversationId() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(
    CHAT_CONVERSATION_KEY,
  );
}

export function saveCreateDeliveryPrefill(
  payload: Record<string, unknown> | null | undefined,
) {
  if (
    typeof window === "undefined" ||
    !payload
  ) {
    return;
  }

  window.sessionStorage.setItem(
    CREATE_DELIVERY_PREFILL_KEY,
    JSON.stringify(payload),
  );
}

export function readCreateDeliveryPrefill<
  T = Record<string, unknown>,
>() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(
    CREATE_DELIVERY_PREFILL_KEY,
  );

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function clearCreateDeliveryPrefill() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(
    CREATE_DELIVERY_PREFILL_KEY,
  );
}
