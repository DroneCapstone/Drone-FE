import { isRecord, TechnicianApiError, technicianApiRequest } from "../utils/technicianApi";

export type TechnicianChatWorkOrderContext = {
  workOrderId: string;
  droneId: string;
  droneModel: string;
  issue: string;
  status: string;
  diagnosis: string;
  correctiveAction: string;
  completedInspectionItems: string[];
};

// BE confirmed these Technician endpoints. technicianApiRequest prepends /api/v1
// and sends the same authenticated session as other Technician requests.
const DEFAULT_ASK_PATH = "/technician/chatbot/chat";
const QUICK_QUESTIONS_PATH = "/technician/chatbot/quick-questions";

function getAskPath(): string {
  const configured = String(import.meta.env.VITE_TECH_CHATBOT_ASK_PATH ?? "").trim();
  if (!configured) return DEFAULT_ASK_PATH;

  if (/^https?:\/\//i.test(configured) || configured.includes("?")) {
    throw new Error("VITE_TECH_CHATBOT_ASK_PATH phải là đường dẫn API, không phải URL đầy đủ hoặc URL có query.");
  }

  const path = `/${configured.replace(/^\/+/, "")}`
    .replace(/^\/api\/v1(?=\/)/i, "")
    .replace(/\/+$/, "");

  if (!/^\/[\w/-]+$/.test(path) || /(?:^|\/)admin(?:\/|$)/i.test(path) || /(?:^|\/)seed(?:\/|$)/i.test(path)) {
    throw new Error("Đường dẫn chatbot không hợp lệ. Không sử dụng endpoint Admin/seed.");
  }
  return path;
}

function getAnswerText(payload: unknown, depth = 0): string | null {
  if (depth > 4) return null;
  if (typeof payload === "string") return payload.trim() || null;
  if (!isRecord(payload)) return null;

  for (const key of ["answer", "reply", "response", "assistant_response", "ai_response", "response_text", "output", "content", "text"]) {
    const answer = payload[key];
    if (typeof answer === "string" && answer.trim()) return answer.trim();
    if (isRecord(answer)) {
      const nested = getAnswerText(answer, depth + 1);
      if (nested) return nested;
    }
  }

  // Prefer the actual answer in nested data over a generic "message: success".
  for (const key of ["data", "result", "assistant_message"]) {
    if (payload[key] !== undefined) {
      const nested = getAnswerText(payload[key], depth + 1);
      if (nested) return nested;
    }
  }

  if (typeof payload.message === "string" && payload.message.trim()) {
    const message = payload.message.trim();
    if (!/^(success|ok|completed)$/i.test(message)) return message;
  }
  return null;
}

/**
 * Common GET /quick-questions responses:
 * ["..."], [{ question: "..." }], { quick_questions: [...] },
 * { questions: [...] }, or { data: { questions: [...] } }.
 * The real questions always come from Backend; no mock suggestions are added.
 */
function collectQuestions(payload: unknown, depth = 0): string[] {
  if (depth > 5) return [];
  if (typeof payload === "string") return payload.trim() ? [payload.trim()] : [];
  if (Array.isArray(payload)) return payload.flatMap((item) => collectQuestions(item, depth + 1));
  if (!isRecord(payload)) return [];

  const listKeys = [
    "quick_questions", "quickQuestions", "questions", "suggested_questions",
    "suggestions", "recommended_questions", "data", "items", "results", "categories",
  ];
  for (const key of listKeys) {
    if (payload[key] !== undefined && payload[key] !== null) {
      const nested = collectQuestions(payload[key], depth + 1);
      if (nested.length) return nested;
    }
  }

  for (const key of ["question", "question_text", "text", "prompt", "label"]) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return [value.trim()];
  }
  // Some APIs group questions under category names, e.g. { battery: [...], motor: [...] }.
  return Object.values(payload)
    .filter((value) => Array.isArray(value) || isRecord(value))
    .flatMap((value) => collectQuestions(value, depth + 1));
}

export async function getTechnicianQuickQuestions(signal?: AbortSignal): Promise<string[]> {
  const payload = await technicianApiRequest<unknown>(QUICK_QUESTIONS_PATH, { method: "GET", signal });
  const isRecognizable = Array.isArray(payload) || (isRecord(payload) && [
    "quick_questions", "quickQuestions", "questions", "suggested_questions", "suggestions",
    "recommended_questions", "data", "items", "results", "categories",
  ].some((key) => key in payload));

  if (!isRecognizable) {
    throw new Error("API quick-questions trả về định dạng chưa hỗ trợ. Cần kiểm tra response JSON của Backend.");
  }

  const unique = new Set(collectQuestions(payload).map((question) => question.trim()).filter(Boolean));
  return [...unique].slice(0, 12);
}

/**
 * A 422 from FastAPI tells us which required field was missing. If BE expects
 * `message` instead of `question`, retry only when its schema explicitly says so.
 * A rejected validation request does not perform a chatbot operation.
 */
function requiredChatField(error: unknown): "message" | "query" | "prompt" | "text" | null {
  if (!(error instanceof TechnicianApiError) || error.status !== 422 || !isRecord(error.payload)) return null;
  const details = error.payload.detail;
  if (!Array.isArray(details)) return null;
  const required = details
    .filter(isRecord)
    .filter((item) => item.type === "missing" && Array.isArray(item.loc))
    .map((item) => (item.loc as unknown[]).filter((part) => typeof part === "string" || typeof part === "number").map(String));
  if (required.length !== 1 || required[0][0] !== "body") return null;
  const candidate = required[0][1];
  return candidate === "message" || candidate === "query" || candidate === "prompt" || candidate === "text"
    ? candidate
    : null;
}

export async function askTechnicianChatbot(
  userQuestion: string,
  context: TechnicianChatWorkOrderContext,
  signal?: AbortSignal,
): Promise<string> {
  const question = userQuestion.trim();
  if (!question) throw new Error("Vui lòng nhập câu hỏi.");

  // Keep contextual information in the question, without inventing extra request
  // fields. This assistant provides advice only and never changes a Work Order.
  const contextualQuestion = [
    "Hỗ trợ Technician đánh giá sự cố và đề xuất các bước kiểm tra/bảo trì an toàn.",
    "Thông tin Work Order hiện tại (chỉ dùng làm ngữ cảnh):",
    `Work Order: ${context.workOrderId}`,
    `Drone ID: ${context.droneId}`,
    `Drone model: ${context.droneModel || "Chưa có"}`,
    `Issue: ${context.issue || "Chưa có"}`,
    `Status: ${context.status}`,
    `Inspection completed: ${context.completedInspectionItems.join("; ") || "Chưa có"}`,
    `Diagnosis: ${context.diagnosis || "Chưa có"}`,
    `Corrective action: ${context.correctiveAction || "Chưa có"}`,
    "Không tự quyết định đưa drone vào khai thác; nếu thiếu bằng chứng hãy nêu các kiểm tra cần thực hiện.",
    `Câu hỏi của Technician: ${question}`,
  ].join("\n");

  const askPath = getAskPath();
  const send = (field: "question" | "message" | "query" | "prompt" | "text") => technicianApiRequest<unknown>(askPath, {
    method: "POST",
    body: JSON.stringify({ [field]: contextualQuestion }),
    signal,
  });

  let response: unknown;
  try {
    response = await send("question");
  } catch (error) {
    const alternateField = requiredChatField(error);
    if (!alternateField || signal?.aborted) throw error;
    response = await send(alternateField);
  }

  const answer = getAnswerText(response);
  if (!answer) {
    throw new Error("Backend chưa trả nội dung trả lời AI. Vui lòng kiểm tra response schema của POST /technician/chatbot/chat.");
  }
  return answer;
}
