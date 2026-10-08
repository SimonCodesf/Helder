import { escapeHTML as e } from "./utils.js?v=3.1.5";
import { icon } from "./icons.js?v=3.1.5";
export function cloudPanel(cloud, button) {
  const phase = cloud?.phase ?? "local",
    configured = !!cloud?.config;
  const title =
    {
      local: "Op dit apparaat",
      error: "Sync vraagt aandacht",
      "signed-out": "Sync is beschikbaar",
      unbound: "Verbind je bibliotheek",
      recovering: "Kies een nieuw wachtwoord",
      synced: "Alles bijgewerkt",
      syncing: "Bezig met synchroniseren",
      pending: "Wijzigingen klaar voor sync",
      offline: "Offline · veilig lokaal",
      conflict: "Twee versies om te vergelijken",
      "account-mismatch": "Ander account aangemeld",
    }[phase] ?? "Je apparaten";
  const message = {
    local:
      "Lokaal leren blijft gratis en zonder account. Voor mobiel ↔ web is een eigen syncbackend nodig.",
    "signed-out":
      "Meld je op je telefoon en computer aan met hetzelfde account.",
    recovering:
      "Je herstellink is gecontroleerd. Stel een nieuw wachtwoord in; sync wacht tot die stap klaar is.",
    unbound:
      "Je bent aangemeld. Schakel sync bewust in voordat er kaarten naar je eigen backend gaan.",
    synced:
      "Kaarten, vakstructuur en leerplanning worden gedeeld. Thema en typmodus blijven per apparaat.",
    syncing: "Je lokale wijzigingen worden gecontroleerd en samengevoegd.",
    pending:
      "Je wijzigingen zijn lokaal opgeslagen. Sync volgt na je ronde/editor, of na 30 seconden rust.",
    offline:
      "Blijf leren. Zodra je verbinding hebt, worden wijzigingen samengevoegd.",
    conflict:
      "Er is niets stilzwijgend overschreven. Bekijk de verschillen en kies wat je bewaart.",
    "account-mismatch":
      "Deze lokale collectie hoort bij een ander account/project. Meld eerst af en wis bewust de lokale kopie; verbind hem niet met dit account.",
    error:
      cloud?.message ||
      "Je lokale kaarten blijven beschikbaar. Controleer je verbinding of configuratie.",
  }[phase];
  const last = cloud?.engine?.meta?.lastSync;
  return `<div class="cloud-status ${phase}"><span class="cloud-glyph">${icon(["synced"].includes(phase) ? "check" : ["conflict", "error"].includes(phase) ? "help" : phase === "local" ? "lock" : "refresh")}</span><div><h3>${title}</h3><p>${e(message)}</p>${cloud?.identity ? `<p class="cloud-account">${e(cloud.identity.label)}</p>` : ""}${last ? `<span class="small muted">Laatste sync: ${e(new Intl.DateTimeFormat("nl-BE", { dateStyle: "short", timeStyle: "short" }).format(new Date(last)))}</span>` : ""}</div></div><div class="actions">${!configured ? button("Sync instellen", "cloud-help", "", "", "settings") : !cloud.identity ? cloud.config.providers.map((p) => button("Aanmelden met " + (p === "email" ? "e-mail" : p === "google" ? "Google" : "GitHub"), "cloud-login", "", `data-provider="${p}"`, "lock")).join("") : phase === "recovering" ? button("Nieuw wachtwoord instellen", "email-mode", "primary", 'data-mode="update"', "lock") : phase === "unbound" ? button("Verbind deze bibliotheek", "cloud-connect", "primary", "", "refresh") : phase === "conflict" ? button("Vergelijk de wijzigingen", "cloud-conflicts", "primary", "", "help") : phase !== "account-mismatch" ? button("Nu synchroniseren", "cloud-sync", "", phase === "syncing" ? "disabled" : "", "refresh") : ""}${cloud?.identity ? button("Afmelden & lokaal wissen", "cloud-logout", "ghost", "", "lock") : ""}</div><p class="small muted cloud-privacy">Geen gedeelde kaartendatabase. Iedere account heeft een eigen collectie. Sync is geen historische back-up; exporteer regelmatig ook JSON.</p>`;
}
export function conflictBody(pending, button) {
  const value = (v) =>
    v === undefined
      ? "Verwijderd"
      : typeof v === "string"
        ? v
        : JSON.stringify(v, null, 2);
  return `<p>Wijzigingen aan verschillende kaarten zijn al samengevoegd. Voor deze verschillen kies jij. Je kunt beide oorspronkelijke collecties eerst downloaden.</p><div class="actions">${button("Dit apparaat downloaden", "cloud-recovery", "", 'data-side="local"', "download")}${button("Cloudversie downloaden", "cloud-recovery", "", 'data-side="remote"', "download")}</div><form id="sync-conflicts-form">${pending.conflicts.map((c, i) => `<fieldset class="conflict-card"><legend>${c.key === "structure" ? "Structuur of verwijdering" : c.key.endsWith(":schedule") ? "Gelijktijdige beoordeling" : c.key.startsWith("notes:") ? "Kaartinhoud" : c.key.startsWith("settings") ? "Leerinstelling" : "Gelijktijdige wijziging"} ${i + 1}</legend>${c.message ? `<p class="small muted">${e(c.message)}</p>` : ""}<div class="conflict-choices">${["local", "remote"].map((side) => `<label><input type="radio" name="conflict-${i}" value="${side}" required><strong>${side === "local" ? "Dit apparaat" : "Cloud"}</strong><pre>${e(value(c[side]).slice(0, 2200))}${value(c[side]).length > 2200 ? "\n… (volledig in de download)" : ""}</pre></label>`).join("")}</div>${c.key.endsWith(":schedule") ? '<p class="small muted">De gekozen planning blijft als één geheel staan. Niet-gekozen parallelle pogingen blijven als inactieve geschiedenis bewaard.</p>' : ""}</fieldset>`).join("")}</form>`;
}
