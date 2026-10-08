import { escapeHTML as e } from "./utils.js?v=3.1.17";
export function emailView(mode = "login", email = "") {
  const resetting = mode === "update",
    registering = mode === "register",
    forgot = mode === "forgot";
  return {
    title: resetting
      ? "Een nieuw wachtwoord"
      : registering
        ? "Je eigen leeraccount"
        : forgot
          ? "Wachtwoord herstellen"
          : "Aanmelden met e-mail",
    subtitle: resetting
      ? "Kies een nieuw wachtwoord voor jouw account."
      : registering
        ? "Je bibliotheek blijft eerst lokaal. Sync schakel je zelf in."
        : forgot
          ? "We sturen een herstellink als dit adres een account heeft."
          : "Gebruik hetzelfde account op telefoon en computer.",
    body: `<form id="email-auth-form" data-mode="${mode}" method="post">${!resetting ? `<div class="field"><label for="auth-email">E-mailadres</label><input id="auth-email" name="email" type="email" autocomplete="username" required value="${e(email)}" placeholder="jij@voorbeeld.nl"></div>` : ""}${!forgot ? `<div class="field"><label for="auth-password">${resetting ? "Nieuw wachtwoord" : "Wachtwoord"}</label><input id="auth-password" name="password" type="password" autocomplete="${resetting || registering ? "new-password" : "current-password"}" ${resetting || registering ? 'minlength="8"' : ""} required></div>` : ""}${resetting || registering ? '<div class="field"><label for="auth-password-confirm">Herhaal je wachtwoord</label><input id="auth-password-confirm" name="confirm" type="password" autocomplete="new-password" minlength="8" required><p class="help">Minstens 8 tekens. De aanvullende beveiligingsregels van je project blijven gelden.</p></div>' : ""}</form>${mode === "login" ? '<div class="email-mode-links"><button class="btn ghost" data-action="email-mode" data-mode="register">Account maken</button><button class="btn ghost" data-action="email-mode" data-mode="forgot">Wachtwoord vergeten?</button></div>' : !resetting ? '<button class="btn ghost" data-action="email-mode" data-mode="login">Terug naar aanmelden</button>' : ""}<p class="small muted auth-note">${registering ? "Bevestig je e-mailadres via de mail. We zetten e-mailverificatie niet uit." : forgot ? "Geen accountcontrole wordt getoond. Controleer ook je spammap." : resetting ? "De link moet geldig zijn en je moet aangemeld zijn." : "Je blijft aangemeld op dit apparaat. Op een gedeeld toestel: meld na gebruik af."}</p>`,
    action: resetting
      ? "Wachtwoord bewaren"
      : registering
        ? "Account maken"
        : forgot
          ? "Herstellink sturen"
          : "Aanmelden",
  };
}
