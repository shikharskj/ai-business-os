export type AutomationMetricName = "success" | "fail" | "skip";

export type AutomationMetricLabels = {
  workflowId?: string;
  tenantId?: string;
};

export type AutomationMetrics = {
  increment(
    name: AutomationMetricName,
    labels?: AutomationMetricLabels
  ): void;
  snapshot(): { success: number; fail: number; skip: number };
};

export function createMemoryAutomationMetrics(): AutomationMetrics & {
  events: Array<{ name: AutomationMetricName; labels?: AutomationMetricLabels }>;
} {
  const counts = { success: 0, fail: 0, skip: 0 };
  const events: Array<{
    name: AutomationMetricName;
    labels?: AutomationMetricLabels;
  }> = [];

  return {
    events,
    increment(name, labels) {
      counts[name] += 1;
      events.push({ name, labels });
    },
    snapshot() {
      return { ...counts };
    },
  };
}

/**
 * Production stub: structured log line plus in-process counters.
 * Replace with OpenTelemetry metrics when the collector is wired.
 */
export function createLogAutomationMetrics(): AutomationMetrics {
  const counts = { success: 0, fail: 0, skip: 0 };

  return {
    increment(name, labels) {
      counts[name] += 1;
      console.info(
        JSON.stringify({
          msg: "automation.metric",
          metric: `automation.runs.${name}`,
          count: counts[name],
          workflowId: labels?.workflowId,
          tenantId: labels?.tenantId,
        })
      );
    },
    snapshot() {
      return { ...counts };
    },
  };
}
