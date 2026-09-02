export function getCorrelationId(): string {
  if (typeof window === "undefined") return "";
  let corrId = sessionStorage.getItem("kozker_correlation_id");
  if (!corrId) {
    corrId = "corr_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
    sessionStorage.setItem("kozker_correlation_id", corrId);
  }
  return corrId;
}

export function trackEvent(eventName: string, metadata: Record<string, any> = {}) {
  if (typeof window === "undefined") return;

  const payload = {
    event_name: eventName,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    metadata,
    correlation_id: getCorrelationId()
  };

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  const telemetryUrl = API_BASE.startsWith("http") ? `${API_BASE}/telemetry/event` : `/api/v1/telemetry/event`;

  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    navigator.sendBeacon(telemetryUrl, blob);
  } else {
    fetch(telemetryUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {});
  }
}
