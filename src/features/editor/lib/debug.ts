const CLIENT_DEBUG_FLAG = "NEXT_PUBLIC_EDITOR_FLOW_DEBUG";
const SERVER_DEBUG_FLAG = "EDITOR_FLOW_DEBUG";
const LOCAL_STORAGE_DEBUG_KEY = "editor-flow-debug";

function isTruthyFlag(value: string | undefined): boolean {
  return value === "1" || value === "true";
}

export function isEditorFlowDebugEnabled(): boolean {
  if (typeof window === "undefined") {
    return (
      isTruthyFlag(process.env[SERVER_DEBUG_FLAG]) ||
      isTruthyFlag(process.env[CLIENT_DEBUG_FLAG])
    );
  }

  try {
    return (
      isTruthyFlag(process.env[CLIENT_DEBUG_FLAG]) ||
      window.localStorage.getItem(LOCAL_STORAGE_DEBUG_KEY) === "1"
    );
  } catch {
    return isTruthyFlag(process.env[CLIENT_DEBUG_FLAG]);
  }
}

export function logEditorFlow(
  scope: string,
  message: string,
  data?: Record<string, unknown>,
): void {
  if (!isEditorFlowDebugEnabled()) return;

  const prefix =
    typeof window === "undefined"
      ? "[editor-flow][server]"
      : "[editor-flow][client]";

  if (data) {
    console.info(`${prefix}[${scope}] ${message}`, data);
    return;
  }

  console.info(`${prefix}[${scope}] ${message}`);
}

