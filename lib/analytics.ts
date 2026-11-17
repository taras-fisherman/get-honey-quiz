import * as amplitude from "@amplitude/analytics-browser";

let ready = false;

export function initAnalytics() {
  if (ready || typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
  if (!key) {
    console.info("[analytics] NEXT_PUBLIC_AMPLITUDE_API_KEY is not set, events are logged to the console only");
    return;
  }
  const zone = process.env.NEXT_PUBLIC_AMPLITUDE_SERVER_ZONE === "EU" ? "EU" : "US";
  amplitude.init(key, {
    serverZone: zone,
    autocapture: {
      attribution: true,
      sessions: true,
      pageViews: false,
      formInteractions: false,
      fileDownloads: false,
      elementInteractions: false,
    },
  });
  ready = true;
}

export function track(name: string, props: Record<string, unknown> = {}) {
  if (ready) amplitude.track(name, props);
  if (!ready || process.env.NODE_ENV !== "production") console.log("[event]", name, props);
}

export function setUserProps(props: Record<string, string | number | boolean | string[]>) {
  if (!ready) return;
  const id = new amplitude.Identify();
  for (const [k, v] of Object.entries(props)) id.set(k, v);
  amplitude.identify(id);
}
