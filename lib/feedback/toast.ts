import { toast } from "@/components/ui/toast";

const SUCCESS_TIMEOUT = 4000;
const INFO_TIMEOUT = 4000;
const WARNING_TIMEOUT = 6000;
const ERROR_TIMEOUT = 0;

type ToastType = "success" | "error" | "warning" | "info";

function pushToast(
  type: ToastType,
  title: string,
  description?: string,
  timeout?: number
) {
  return toast.add({
    type,
    title,
    description,
    timeout: timeout ?? (type === "error" ? ERROR_TIMEOUT : SUCCESS_TIMEOUT),
    priority: type === "error" ? "high" : "low",
  });
}

export function notifySuccess(title: string, description?: string) {
  return pushToast("success", title, description, SUCCESS_TIMEOUT);
}

export function notifyError(title: string, description?: string) {
  return pushToast("error", title, description, ERROR_TIMEOUT);
}

export function notifyWarning(title: string, description?: string) {
  return pushToast("warning", title, description, WARNING_TIMEOUT);
}

export function notifyInfo(title: string, description?: string) {
  return pushToast("info", title, description, INFO_TIMEOUT);
}
