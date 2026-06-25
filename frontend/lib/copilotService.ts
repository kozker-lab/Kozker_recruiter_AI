import { apiRequest } from "./api";

export interface CopilotRequestPayload {
  session_id: string;
  request_id: string;
  recruiter_id: string;
  workspace_id: string;
  current_page: string;
  route: string;
  message: string;
  callback_base_url: string;
  authorization: string;
  page_context: Record<string, any>;
  selected_entity: Record<string, any> | null;
  visible_rows: any[];
  visible_data: Record<string, any>;
  entities: Record<string, any>;
  frontend_capabilities: {
    navigation: boolean;
    refresh_page: boolean;
    show_toast: boolean;
    open_drawer: boolean;
    update_local_state: boolean;
  };
  metadata: {
    source: string;
    timestamp: string;
    user_agent: string;
    frontend_version: string;
  };
}

export interface CopilotResponse {
  status: "success" | "error";
  request_id: string;
  automation_type: string;
  action_type: "answer" | "navigate" | "call_workflow" | "missing_fields" | "error";
  intent?: string;
  workflow_called?: boolean;
  workflow_key?: string;
  workflow_url?: string;
  message?: string;
  assistant_reply?: string;
  navigation?: {
    route: string | null;
    page: string | null;
    entity_id: string | null;
    reason: string | null;
  } | null;
  ui_action?: {
    type: "toast" | "open_drawer" | "refresh_page" | "update_local_state" | "none";
    payload: any;
  } | null;
  data?: any;
  workflow_response?: any;
  missing_fields?: string[];
  should_refresh_page?: boolean;
  confidence?: number;
  completed_at?: string;
}

export async function sendCopilotMessage(payload: CopilotRequestPayload): Promise<CopilotResponse> {
  return await apiRequest<CopilotResponse>("POST", "/chatbot/message", payload);
}

export function buildPageContext(currentPage: string, appState: any): Record<string, any> {
  if (appState && appState.page === currentPage) {
    return appState;
  }
  return appState || {};
}

export function handleCopilotResponse(
  response: CopilotResponse,
  handlers: {
    onNavigate: (route: string) => void;
    onShowToast: (title: string, message: string, type?: any) => void;
    onRefreshPage: () => void;
    onAddBotMessage: (text: string) => void;
  }
) {
  if (response.status === "error") {
    handlers.onAddBotMessage("Error: Failed to process request with n8n Copilot. Please try again.");
    return;
  }

  // 1. Show assistant reply or fallback message in chat
  const replyText = response.assistant_reply || response.message || "No response received.";
  handlers.onAddBotMessage(replyText);

  // 2. Handle Navigation
  if (response.action_type === "navigate" && response.navigation?.route) {
    handlers.onNavigate(response.navigation.route);
  }

  // 3. Handle Toast
  if (response.ui_action?.type === "toast") {
    const toastPayload = response.ui_action.payload || {};
    handlers.onShowToast(
      toastPayload.title || "Copilot Alert",
      toastPayload.message || replyText,
      toastPayload.variant || toastPayload.type || "info"
    );
  }

  // 4. Handle Page Refresh
  if (response.should_refresh_page) {
    handlers.onRefreshPage();
  }

  // 5. Handle missing fields
  if (response.action_type === "missing_fields" && response.missing_fields && response.missing_fields.length > 0) {
    handlers.onAddBotMessage(
      `To proceed, I need some missing details: ${response.missing_fields.join(", ")}. Please provide them.`
    );
  }

  // 6. Handle workflow execution status
  if (response.workflow_called) {
    handlers.onAddBotMessage("⚡ Automation started successfully.");
  }
}

export function mapRouteToPage(route: string): string {
  const cleanRoute = route.split("?")[0].split("#")[0].replace(/^\/+|\/+$/g, "");
  switch (cleanRoute) {
    case "dashboard":
      return "dashboard";
    case "clients":
      return "clients_mandates";
    case "jobs":
      return "job_catalog";
    case "pool":
      return "sourcing_pool";
    case "rounds":
      return "stages";
    case "notifications":
      return "notifications";
    case "profile":
    case "settings":
      return "settings";
    default:
      return "dashboard";
  }
}

export function getSuggestionsForPage(page: string): string[] {
  switch (page) {
    case "dashboard":
      return [
        "How are we doing today?",
        "What needs my attention?",
        "Summarize open hiring work."
      ];
    case "clients_mandates":
      return [
        "Summarize this requirement.",
        "Generate job openings for this mandate.",
        "What details are missing?"
      ];
    case "job_catalog":
      return [
        "Make this role more attractive.",
        "Recalculate weighted skills.",
        "Generate screening questions.",
        "Find matching candidates.",
        "Change experience from 3 years to 5 years."
      ];
    case "sourcing_pool":
      return [
        "Find React candidates.",
        "Who has Python and Django?",
        "Summarize this candidate.",
        "Who is the strongest candidate?"
      ];
    case "stages":
      return [
        "Who needs review?",
        "Why did this candidate score high?",
        "Show pending technical interviews.",
        "Summarize this pipeline."
      ];
    case "notifications":
      return [
        "What happened today?",
        "Any urgent errors?",
        "Summarize audit logs."
      ];
    case "settings":
      return [
        "What can I change here?",
        "Enable email alerts.",
        "Explain these preferences."
      ];
    default:
      return [
        "How are we doing today?",
        "What needs my attention?",
        "Summarize open hiring work."
      ];
  }
}
