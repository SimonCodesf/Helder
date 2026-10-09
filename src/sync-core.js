import { emptyCollection, validateCollection } from "./model.js?v=3.1.26";
const groups = ["folders", "sets", "notes", "cards", "reviews", "activities"];
const localSettings = ["theme", "answerMode"];
const copy = (v) => (v === undefined ? undefined : structuredClone(v));
export function canonical(v) {
  if (v === undefined) return "undefined";
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  return (
    "{" +
    Object.keys(v)
      .filter((k) => v[k] !== undefined)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + canonical(v[k]))
      .join(",") +
    "}"
  );
}
export const equal = (a, b) => canonical(a) === canonical(b);
export function cloudSnapshot(collection) {
  const s = validateCollection(copy(collection)),
    settings = { ...s.settings };
  localSettings.forEach((k) => delete settings[k]);
  return {
    version: 1,
    ...Object.fromEntries(groups.map((g) => [g, copy(s[g] ?? [])])),
    settings,
  };
}
export function localFromCloud(snapshot, local) {
  return validateCollection({
    ...snapshot,
    revision: local.revision,
    seeded: true,
    lastBackup: local.lastBackup,
    settings: {
      ...snapshot.settings,
      ...Object.fromEntries(localSettings.map((k) => [k, local.settings[k]])),
    },
  });
}
export function mergeCollections(
  baseCollection,
  localCollection,
  remoteCollection,
  resolutions = {},
) {
  const base = cloudSnapshot(baseCollection),
    local = cloudSnapshot(localCollection),
    remote = cloudSnapshot(remoteCollection),
    conflicts = [];
  const pick = (b, l, r, path) => {
    if (equal(l, r)) return copy(l);
    if (equal(b, l)) return copy(r);
    if (equal(b, r)) return copy(l);
    if (path.endsWith(":updatedAt") && Number.isFinite(l) && Number.isFinite(r))
      return Math.max(l, r);
    if (
      path.endsWith(":buriedUntil") &&
      Number.isFinite(l) &&
      Number.isFinite(r)
    )
      return Math.max(l, r);
    const atomic = path.endsWith(":schedule") || path.endsWith(":learning");
    if (
      !atomic &&
      b &&
      l &&
      r &&
      typeof b === "object" &&
      typeof l === "object" &&
      typeof r === "object" &&
      !Array.isArray(b) &&
      !Array.isArray(l) &&
      !Array.isArray(r)
    ) {
      const result = {};
      for (const k of new Set([
        ...Object.keys(b),
        ...Object.keys(l),
        ...Object.keys(r),
      ])) {
        if (["__proto__", "prototype", "constructor"].includes(k)) continue;
        const value = pick(b[k], l[k], r[k], path + ":" + k);
        if (value !== undefined) result[k] = value;
      }
      return result;
    }
    if (resolutions[path] === "local") return copy(l);
    if (resolutions[path] === "remote") return copy(r);
    conflicts.push({
      key: path,
      base: copy(b),
      local: copy(l),
      remote: copy(r),
    });
    return copy(l); // Provisional only. Caller must never apply unresolved results.
  };
  const merged = {
    version: 1,
    settings: pick(base.settings, local.settings, remote.settings, "settings"),
  };
  for (const group of groups) {
    const b = new Map(base[group].map((v) => [v.id, v])),
      l = new Map(local[group].map((v) => [v.id, v])),
      r = new Map(remote[group].map((v) => [v.id, v]));
    const ids = new Set([...b.keys(), ...r.keys(), ...l.keys()]);
    merged[group] = [];
    for (const id of ids) {
      const value = pick(b.get(id), l.get(id), r.get(id), group + ":" + id);
      if (value !== undefined) merged[group].push(value);
    }
  }
  // Scheduling is atomic. If two devices rated the same card offline, the user
  // chooses the coherent rating branch. Other branch attempts remain in history
  // but are explicitly inactive; FSRS values are never field-wise averaged.
  for (const [key, choice] of Object.entries(resolutions)) {
    if (!key.startsWith("cards:") || !key.endsWith(":schedule")) continue;
    const cardId = key.slice(6, -9),
      chosen = choice === "local" ? local : remote,
      rejected = choice === "local" ? remote : local;
    const active = chosen.reviews.filter((r) => r.cardId === cardId),
      ids = new Set(active.map((r) => r.id));
    const inactive = rejected.reviews
      .filter((r) => r.cardId === cardId && !ids.has(r.id))
      .map((r) => ({
        ...r,
        inactive: true,
        conflictReason: "parallel-review",
      }));
    merged.reviews = merged.reviews
      .filter((r) => r.cardId !== cardId)
      .concat(active, inactive);
  }
  if (conflicts.length) return { collection: merged, conflicts };
  try {
    validateCollection(merged);
  } catch (error) {
    // Concurrent deletion/reparenting or a template change can make references
    // inconsistent even without a text conflict. Never silently repair/drop data.
    const key = "structure";
    if (resolutions[key])
      return {
        collection: copy(resolutions[key] === "local" ? local : remote),
        conflicts: [],
      };
    return {
      collection: merged,
      conflicts: [{ key, base, local, remote, message: error.message }],
    };
  }
  return { collection: merged, conflicts: [] };
}
export class LocalChangedError extends Error {
  constructor() {
    super("Je lokale collectie veranderde tijdens synchronisatie.");
    this.name = "LocalChangedError";
  }
}
export class SyncEngine {
  constructor({
    transport,
    store,
    getLocal,
    applyLocal,
    canSync = () => true,
    onStatus = () => {},
  }) {
    Object.assign(this, {
      transport,
      store,
      getLocal,
      applyLocal,
      canSync,
      onStatus,
    });
    this.meta = null;
    this.phase = "local";
    this.pending = null;
    this.busy = null;
    this.resolutions = {};
  }
  cancel() {
    this.stopped = true;
    if (this.meta) this.meta.enabled = false;
  }
  status(phase, message = "") {
    if (this.stopped) return;
    this.phase = phase;
    this.message = message;
    this.onStatus({ phase, message, lastSync: this.meta?.lastSync ?? 0 });
  }
  async init(userId, endpoint) {
    this.userId = userId;
    this.endpoint = endpoint;
    this.meta = await this.store.get("sync-meta");
    if (
      this.meta &&
      (this.meta.userId !== userId || this.meta.endpoint !== endpoint)
    ) {
      this.status(
        "account-mismatch",
        "Deze lokale bibliotheek hoort bij een ander account of project.",
      );
      return;
    }
    this.status(this.meta?.enabled ? "pending" : "unbound");
  }
  async connect() {
    if (this.phase === "account-mismatch")
      throw new Error("Meld het vorige account eerst af en maak een back-up.");
    if (!this.userId) throw new Error("Meld je eerst aan.");
    this.meta = {
      userId: this.userId,
      endpoint: this.endpoint,
      enabled: true,
      base: cloudSnapshot(emptyCollection()),
      revision: 0,
      lastSync: 0,
    };
    await this.store.set("sync-meta", this.meta);
    return this.sync();
  }
  async sync() {
    if (this.busy) return this.busy;
    if (
      this.stopped ||
      !this.meta?.enabled ||
      this.phase === "account-mismatch"
    )
      return;
    if (!this.canSync()) {
      this.status("pending", "Na je ronde of editor wordt gesynchroniseerd.");
      return;
    }
    this.busy = this.run().finally(() => {
      this.busy = null;
    });
    return this.busy;
  }
  async run() {
    try {
      this.status("syncing");
      for (let tries = 0; tries < 3; tries++) {
        if (this.stopped || !this.meta?.enabled) return;
        if (!this.canSync()) {
          this.status("pending");
          return;
        }
        const local = copy(this.getLocal()),
          payload = cloudSnapshot(local),
          metadata = await this.transport.metadata();
        const revision = metadata?.revision ?? 0;
        if (revision === this.meta.revision && equal(payload, this.meta.base)) {
          this.status("synced");
          return;
        }
        const row =
          revision === this.meta.revision
            ? { revision, payload: this.meta.base }
            : await this.transport.read();
        const remote = row?.payload ?? cloudSnapshot(emptyCollection()),
          remoteRevision = row?.revision ?? 0;
        const result = mergeCollections(
          this.meta.base,
          payload,
          remote,
          this.resolutions,
        );
        if (result.conflicts.length) {
          this.pending = {
            base: copy(this.meta.base),
            local: payload,
            remote,
            conflicts: result.conflicts,
          };
          await this.store.set("sync-recovery", {
            ...this.pending,
            time: Date.now(),
          });
          this.status(
            "conflict",
            "Kies welke gelijktijdige wijzigingen je wilt bewaren. Er is niets overschreven.",
          );
          return;
        }
        if (this.stopped || !this.meta?.enabled) return;
        if (!this.canSync()) {
          this.status("pending");
          return;
        }
        if (!equal(payload, result.collection)) {
          try {
            await this.applyLocal(
              localFromCloud(result.collection, local),
              local.revision,
            );
          } catch (error) {
            if (
              error.name === "LocalChangedError" ||
              error.name === "ConflictError"
            )
              continue;
            throw error;
          }
        }
        // We have now incorporated the fetched remote version locally. This base
        // checkpoint makes retries safe even when a push races another device.
        if (this.stopped || !this.meta?.enabled) return;
        this.meta = {
          ...this.meta,
          base: copy(remote),
          revision: remoteRevision,
        };
        await this.store.set("sync-meta", this.meta);
        if (!equal(result.collection, remote)) {
          const pushed = await this.transport.push(
            result.collection,
            remoteRevision,
          );
          if (this.stopped || !this.meta?.enabled) return;
          if (!pushed.ok) continue;
          this.meta = {
            ...this.meta,
            base: copy(result.collection),
            revision: pushed.revision,
            lastSync: Date.now(),
          };
        } else this.meta.lastSync = Date.now();
        await this.store.set("sync-meta", this.meta);
        this.pending = null;
        this.resolutions = {};
        this.status(
          equal(cloudSnapshot(this.getLocal()), this.meta.base)
            ? "synced"
            : "pending",
        );
        return;
      }
      this.status(
        "pending",
        "Een ander apparaat wijzigde je collectie. Probeer opnieuw.",
      );
    } catch (error) {
      this.status(
        "error",
        error.message || "Sync mislukt. Alles blijft lokaal bewaard.",
      );
      throw error;
    }
  }
  async resolve(choices) {
    if (!this.pending) return;
    for (const c of this.pending.conflicts)
      if (!["local", "remote"].includes(choices[c.key]))
        throw new Error("Maak voor elke wijziging een keuze.");
    this.resolutions = { ...this.resolutions, ...choices };
    return this.sync();
  }
}
