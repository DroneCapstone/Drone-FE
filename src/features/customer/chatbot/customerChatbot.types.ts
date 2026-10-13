export type ChatRole = "user" | "model";

export type ChatHistoryItem = {
  role: ChatRole;
  content: string;
};

export type CustomerChatbotDataType =
  | "package_rules"
  | "package_recommendation"
  | "pricing_rules"
  | "delivery_modes"
  | "shipping_estimate"
  | "hub_list"
  | "hub_resolution"
  | "help_policy"
  | "order_list"
  | "order_detail"
  | "delivery_status"
  | "payment_status"
  | "handover_status"
  | "delivery_eta"
  | "cancellation_eligibility"
  | "notification_list"
  | "profile_info"
  | "generic_answer"
  | string;

export type CustomerChatbotData = {
  type?: CustomerChatbotDataType;
  code?: string;
  success?: boolean;
  [key: string]: unknown;
};

export type CustomerChatbotActionType =
  | "CREATE_DELIVERY"
  | "OPEN_ORDER_TRACKING"
  | "OPEN_PAYMENT"
  | "OPEN_PRICING"
  | "OPEN_NOTIFICATIONS"
  | "LOGIN_REQUIRED"
  | string;

export type CustomerChatbotAction = {
  type: CustomerChatbotActionType;
  label: string;
  href?: string | null;
  payload?: Record<string, unknown> | null;
};

export type CustomerChatbotMeta = {
  request_id?: string;
  [key: string]: unknown;
};

export type CustomerChatbotResponse = {
  conversation_id: string;
  reply: string;
  tools_called: string[];
  data: CustomerChatbotData | null;
  actions: CustomerChatbotAction[];
  meta?: CustomerChatbotMeta | null;
};

export type QuickQuestion = {
  id: string;
  title: string;
  prompt: string;
};

export type QuickQuestionsResponse = {
  questions: QuickQuestion[];
};

export type CustomerChatbotRequest = {
  message: string;
  conversation_id?: string | null;
  history?: ChatHistoryItem[];
};

export type ChatUiMessage = {
  id: string;
  role: ChatRole;
  content: string;
  data?: CustomerChatbotData | null;
  actions?: CustomerChatbotAction[];
  toolsCalled?: string[];
  requestId?: string;
};
