import { isRecord, technicianApiRequest } from "../utils/technicianApi";

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

/**
 * The Admin RAG seed endpoint is for knowledge-base ingestion, NOT for chat.
 * BE must provide the technician-accessible question-answer endpoint separately.
 * Set VITE_TECH_CHATBOT_ASK_PATH to that endpoint, relative to /api/v1.
 * Example shape only: /technician/.../ask (do not assume this path exists).
 */
function getAskPath(): string {
  const configured = String(import.meta.env.VITE_TECH_CHATBOT_ASK_PATH ?? "").trim();
  if (!configured) {
    throw new Error(
      "Chưa cấu hình API hỏi đáp của Technician. Cần BE cung cấp endpoint POST hỏi đáp và đặt VITE_TECH_CHATBOT_ASK_PATH trong .env.",
    );
  }

  if (/^https?:\/\//i.test(configured) || configured.includes("?")) {
    throw new Error("VITE_TECH_CHATBOT_ASK_PATH phải là đường dẫn API, không phải URL đầy đủ hoặc URL có query.");
  }

  // technicianApiRequest already prepends API_BASE_URL, usually ending /api/v1.
  let path = `/${configured.replace(/^\/+/, "")}`.replace(/^\/api\/v1(?=\/)/i, "");
  path = path.replace(/\/+$/, "");
  if (!/^\/[\w/-]+$/.test(path) || /(?:^|\/)admin(?:\/|$)/i.test(path) || /(?:^|\/)seed(?:\/|$)/i.test(path)) {
    throw new Error("Đường dẫn hỏi đáp không hợp lệ. Không dùng API Admin/seed để chat.");
  }
  return path;
}

function getAnswerText(payload: unknown): string | null {
  if (typeof payload === "string") return payload.trim() || null;
  if (!isRecord(payload)) return null;

  for (const key of ["answer", "response", "reply", "content", "message", "text"]) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (isRecord(value) && typeof value.content === "string" && value.content.trim()) {
      return value.content.trim();
    }
  }
  for (const key of ["data", "result"]) {
    if (payload[key] && payload[key] !== payload) {
      const nested = getAnswerText(payload[key]);
      if (nested) return nested;
    }
  }
  return null;
}

export async function askTechnicianChatbot(
  userQuestion: string,
  context: TechnicianChatWorkOrderContext,
  signal?: AbortSignal,
): Promise<string> {
  const question = userQuestion.trim();
  if (!question) throw new Error("Vui lòng nhập câu hỏi.");

  // The BE chat request schema has not been supplied. `question` is the
  // expected default; adjust ONLY here if the official schema differs.
  // Keep work-order context inside one question, without inventing extra fields.
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
    "Không tự đưa ra quyết định bay/khai thác lại drone. Nếu thiếu bằng chứng, hãy nói rõ cần kiểm tra thêm.",
    `Câu hỏi của Technician: ${question}`,
  ].join("\n");

  const response = await technicianApiRequest<unknown>(getAskPath(), {
    method: "POST",
    body: JSON.stringify({ question: contextualQuestion }),
    signal,
  });

  const answer = getAnswerText(response);
  if (!answer) {
    throw new Error("Backend chưa trả về nội dung trả lời. Kiểm tra response schema API chatbot với BE.");
  }
  return answer;
}
