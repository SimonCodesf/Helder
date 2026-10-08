import { getDeviceValue, setDeviceValue } from "./storage.js?v=3.0.0";
import { SyncEngine } from "./sync-core.js?v=3.0.0";
export function validateCloudConfig(config) {
  if (!config?.supabaseUrl && !config?.publishableKey) return null;
  let url;
  try {
    url = new URL(config.supabaseUrl);
  } catch {
    throw new Error("Controleer de Supabase-URL in config.json.");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error(
      "Gebruik de HTTPS-project-URL zonder pad of inloggegevens.",
    );
  const key = String(config.publishableKey ?? "");
  if (key.startsWith("sb_secret_"))
    throw new Error("Gebruik nooit een secret- of service-role-key in de app.");
  if (!key.startsWith("sb_publishable_")) {
    try {
      const p = JSON.parse(
        atob(key.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")),
      );
      if (p.role !== "anon") throw new Error();
    } catch {
      throw new Error(
        "Gebruik alleen een publishable key of de oude anon key. Geen service-role-key.",
      );
    }
  }
  if (
    !Array.isArray(config.providers) ||
    !config.providers.length ||
    config.providers.some((p) => !["google", "github"].includes(p))
  )
    throw new Error("Kies google en/of github als ondersteunde loginprovider.");
  return { url: url.origin, key, providers: config.providers };
}
class SupabaseTransport {
  constructor(client, userId) {
    this.client = client;
    this.userId = userId;
  }
  async metadata() {
    const { data, error } = await this.client
      .from("helder_collections")
      .select("revision,updated_at")
      .eq("user_id", this.userId)
      .maybeSingle();
    if (error)
      throw new Error(
        "Cloud lezen mislukt. Controleer de backend en je verbinding.",
      );
    return data;
  }
  async read() {
    const { data, error } = await this.client
      .from("helder_collections")
      .select("revision,payload")
      .eq("user_id", this.userId)
      .maybeSingle();
    if (error)
      throw new Error("Cloud lezen mislukt. Je lokale gegevens blijven staan.");
    return data;
  }
  async push(payload, expected) {
    const { data, error } = await this.client.rpc("helder_push", {
      p_payload: payload,
      p_expected: expected,
    });
    if (error)
      throw new Error(
        "Cloud opslaan mislukt. Controleer de backend, je verbinding en de 8 MB-collectielimiet.",
      );
    return data;
  }
}
export class CloudConnection {
  constructor({ getLocal, applyLocal, canSync, onStatus }) {
    Object.assign(this, { getLocal, applyLocal, canSync, onStatus });
    this.phase = "local";
    this.config = null;
    this.identity = null;
    this.engine = null;
    this.timer = null;
  }
  notify(phase, message = "") {
    this.phase = phase;
    this.message = message;
    this.onStatus?.();
  }
  async start() {
    try {
      const returningFromAuth = new URL(location.href).searchParams.has("code");
      const response = await fetch(new URL("../config.json", import.meta.url), {
        cache: "no-cache",
      });
      if (!response.ok) throw new Error("config.json kon niet geladen worden.");
      this.config = validateCloudConfig(await response.json());
      if (!this.config) {
        this.notify("local");
        return;
      }
      const { createClient } = await import("../vendor/supabase.mjs?v=3.0.0");
      const storage = {
        getItem: (key) => getDeviceValue("oauth:" + key),
        setItem: (key, value) => setDeviceValue("oauth:" + key, value),
        removeItem: (key) => setDeviceValue("oauth:" + key, null),
      };
      this.client = createClient(this.config.url, this.config.key, {
        auth: {
          storage,
          flowType: "pkce",
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        realtime: { params: { eventsPerSecond: 1 } },
      });
      this.client.auth.onAuthStateChange((_event, session) =>
        setTimeout(
          () =>
            this.setSession(session).catch((e) =>
              this.notify("error", e.message),
            ),
          0,
        ),
      );
      const { data, error } = await this.client.auth.getSession();
      if (error)
        throw new Error("Aanmelden kon niet worden afgerond. Probeer opnieuw.");
      await this.setSession(data.session);
      if (returningFromAuth && data.session) location.hash = "#/settings";
      this.poll = setInterval(() => {
        if (document.visibilityState === "visible" && navigator.onLine)
          this.sync().catch(() => {});
      }, 60000);
      window.addEventListener("online", () => this.sync().catch(() => {}));
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && navigator.onLine)
          this.sync().catch(() => {});
      });
    } catch (error) {
      this.notify("error", error.message);
    }
  }
  async setSession(session) {
    if (!session) {
      this.identity = null;
      this.engine = null;
      this.notify(this.config ? "signed-out" : "local");
      return;
    }
    const id = session.user.id;
    if (this.identity?.id === id && this.engine) return;
    this.identity = {
      id,
      label:
        session.user.email ||
        session.user.user_metadata?.user_name ||
        "Je account",
    };
    const engine = new SyncEngine({
      transport: new SupabaseTransport(this.client, id),
      store: { get: getDeviceValue, set: setDeviceValue },
      getLocal: this.getLocal,
      applyLocal: this.applyLocal,
      canSync: this.canSync,
      onStatus: ({ phase, message }) => {
        if (this.engine === engine) this.notify(phase, message);
      },
    });
    this.engine = engine;
    await engine.init(id, this.config.url);
    this.notify(engine.phase, engine.message);
    if (engine.meta?.enabled && engine.phase !== "account-mismatch")
      this.sync().catch(() => {});
  }
  async signIn(provider) {
    if (!this.config?.providers.includes(provider))
      throw new Error("Deze loginprovider is niet ingesteld.");
    const redirect = new URL(location.pathname, location.origin).href;
    const { error } = await this.client.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirect },
    });
    if (error)
      throw new Error(
        "Aanmelden kon niet gestart worden. Controleer de providerconfiguratie.",
      );
  }
  async connect() {
    if (!this.engine) throw new Error("Meld je eerst aan.");
    return this.engine.connect();
  }
  markDirty() {
    if (!this.engine?.meta?.enabled) return;
    if (this.engine.phase === "account-mismatch") return;
    this.notify("pending");
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.sync().catch(() => {}), 30000);
  }
  async sync() {
    if (!navigator.onLine) {
      if (this.engine?.meta?.enabled)
        this.notify("offline", "Je wijzigingen wachten lokaal op verbinding.");
      return;
    }
    return this.engine?.sync();
  }
  async resolve(choices) {
    return this.engine?.resolve(choices);
  }
  async signOut() {
    clearTimeout(this.timer);
    this.engine?.cancel();
    await setDeviceValue("sync-meta", null);
    await setDeviceValue("sync-recovery", null);
    const { error } = await this.client.auth.signOut({ scope: "local" });
    if (error)
      throw new Error(
        "Afmelden niet afgerond. Probeer opnieuw zodra je online bent.",
      );
    this.identity = null;
    this.engine = null;
    this.notify("signed-out");
  }
}
