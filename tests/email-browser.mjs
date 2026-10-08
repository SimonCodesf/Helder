// Actual vendored SDK, mocked Auth only. No live accounts or emails.
import {
  chromium,
  launchOptions,
  TEST_URL,
  outputFile,
} from "./browser-environment.mjs";
import assert from "node:assert/strict";
const browser = await chromium.launch(launchOptions);
const backend = "https://email.example.test",
  id = "33333333-3333-4333-8333-333333333333";
const testPassword = "LOCAL_TEST_ONLY_8429",
  calls = { signup: 0, login: 0, recover: 0, verify: 0, update: 0, rest: 0 };
const redirects = [],
  errors = [],
  contexts = [];
const user = {
  id,
  email: "reader@example.test",
  aud: "authenticated",
  role: "authenticated",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  created_at: new Date().toISOString(),
};
const token = [
  btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })),
  btoa(
    JSON.stringify({
      sub: id,
      role: "authenticated",
      aud: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ),
  btoa("LOCAL_MOCK_SIGNATURE"),
].join(".");
const authSession = () => ({
  access_token: token,
  refresh_token: "LOCAL_MOCK_REFRESH",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user,
});
async function make(query = "") {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: "light",
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  contexts.push(context);
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await context.route("**/config.json", (r) =>
    r.fulfill({
      json: {
        supabaseUrl: backend,
        publishableKey: "sb_publishable_LOCAL_EMAIL_MOCK_ONLY",
        providers: ["email"],
      },
    }),
  );
  await context.route(backend + "/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      body = ["POST", "PUT"].includes(req.method()) ? req.postDataJSON() : {};
    if (url.pathname.startsWith("/rest/")) {
      calls.rest++;
      return route.fulfill({ json: [] });
    }
    if (url.pathname === "/auth/v1/signup") {
      calls.signup++;
      redirects.push(url.searchParams.get("redirect_to"));
      assert.equal(body.password, testPassword);
      return route.fulfill({ json: user });
    }
    if (url.pathname === "/auth/v1/token") {
      calls.login++;
      if (body.email === "bad@example.test")
        return route.fulfill({
          status: 400,
          json: {
            error_code: "invalid_credentials",
            msg: "Invalid credentials",
          },
        });
      assert.equal(body.password, testPassword);
      return route.fulfill({ json: authSession() });
    }
    if (url.pathname === "/auth/v1/recover") {
      calls.recover++;
      redirects.push(url.searchParams.get("redirect_to"));
      return route.fulfill({ json: {} });
    }
    if (url.pathname === "/auth/v1/verify") {
      calls.verify++;
      if (body.token_hash === "EXPIRED_TEST_TOKEN")
        return route.fulfill({
          status: 403,
          json: { error_code: "otp_expired", msg: "Token has expired" },
        });
      return route.fulfill({ json: authSession() });
    }
    if (url.pathname === "/auth/v1/user") {
      if (req.method() === "PUT") {
        calls.update++;
        assert.equal(body.password, testPassword);
      }
      return route.fulfill({ json: user });
    }
    if (url.pathname === "/auth/v1/logout")
      return route.fulfill({ status: 204, body: "" });
    return route.fulfill({
      status: 400,
      json: { message: "Unexpected local mock endpoint" },
    });
  });
  await page.goto(TEST_URL + "/" + query + "#/settings");
  await page.locator("#cloud-panel").waitFor();
  return { page, context };
}
const click = (p, a) => p.locator(`[data-action="${a}"]`).first().click();
const mode = (p, m) =>
  p.locator(`[data-action="email-mode"][data-mode="${m}"]`).click();
const submit = (p) => p.locator("[data-auth-submit]").click();
async function fillPassword(p, email, confirm = false) {
  if (await p.locator("#auth-email").count())
    await p.locator("#auth-email").fill(email);
  await p.locator("#auth-password").fill(testPassword);
  if (confirm) await p.locator("#auth-password-confirm").fill(testPassword);
}
async function capture(p, name) {
  await p.waitForTimeout(150);
  await p.locator("#toast").evaluate((el) => (el.hidden = true));
  await p.screenshot({ path: outputFile(name + ".png") });
}
const collection = (p) =>
  p.evaluate(async () => {
    const r = indexedDB.open("helder-v1"),
      db = await new Promise(
        (resolve) => (r.onsuccess = () => resolve(r.result)),
      );
    return new Promise((resolve) => {
      const q = db.transaction("state").objectStore("state").get("collection");
      q.onsuccess = () => resolve(q.result);
    });
  });
async function assertPrivateCollection(p) {
  const v = await collection(p);
  assert.equal(v.notes.length, 0);
  assert.equal(v.reviews.length, 0);
  assert.equal(JSON.stringify(v).includes(testPassword), false);
  assert.equal(JSON.stringify(v).includes(token), false);
}
let last;
try {
  const a = await make();
  last = a.page;
  await a.page.locator(".cloud-status.signed-out").waitFor();
  assert.equal(await a.page.locator('[data-action="cloud-login"]').count(), 1);
  await click(a.page, "cloud-login");
  await capture(a.page, "24-email-login-mobile");
  assert.equal(
    await a.page
      .locator("#auth-password")
      .evaluate((el) => el.offsetHeight >= 44),
    true,
  );
  console.log("PASS email-only login and touch-sized native password form");
  await mode(a.page, "register");
  await fillPassword(a.page, "reader@example.test", true);
  await capture(a.page, "25-email-register-mobile");
  await submit(a.page);
  await a.page
    .locator("#modal-title")
    .filter({ hasText: "Bevestig je e-mailadres" })
    .waitFor();
  assert.equal(calls.signup, 1);
  assert.equal(redirects[0], TEST_URL + "/");
  await assertPrivateCollection(a.page);
  await capture(a.page, "26-email-confirm-notice");
  console.log("PASS registration confirmation and no library upload");
  await mode(a.page, "login");
  await fillPassword(a.page, "bad@example.test");
  await submit(a.page);
  await a.page.locator("#modal-error:not([hidden])").waitFor();
  assert.match(await a.page.locator("#modal-error").innerText(), /klopt niet/);
  assert.equal(await a.page.locator("#auth-password").inputValue(), "");
  await capture(a.page, "27-email-login-error");
  console.log("PASS safe credential error and password field clearing");
  await mode(a.page, "forgot");
  await a.page.locator("#auth-email").fill("unknown@example.test");
  await submit(a.page);
  await a.page
    .locator("#modal-title")
    .filter({ hasText: "Controleer je e-mail" })
    .waitFor();
  assert.equal(calls.recover, 1);
  assert.match(redirects[1], /\?auth_recovery=1$/);
  await capture(a.page, "28-email-reset-notice");
  console.log("PASS generic reset notice without account enumeration");
  await mode(a.page, "login");
  await fillPassword(a.page, "reader@example.test");
  await submit(a.page);
  await a.page.locator("#modal").waitFor({ state: "hidden" });
  await a.page.locator(".cloud-status.unbound").waitFor();
  assert.equal(calls.rest, 0);
  await assertPrivateCollection(a.page);
  console.log("PASS SDK password login with explicit separate sync opt-in");
  const r = await make("?token_hash=RECOVERY_TEST_TOKEN&type=recovery");
  last = r.page;
  await r.page.locator(".cloud-status.recovering").waitFor();
  assert.equal(new URL(r.page.url()).search, "");
  assert.equal(calls.rest, 0);
  await mode(r.page, "update");
  await fillPassword(r.page, "", true);
  await capture(r.page, "29-email-recovery-mobile");
  await submit(r.page);
  await r.page.locator("#modal").waitFor({ state: "hidden" });
  await r.page.locator(".cloud-status.unbound").waitFor();
  assert.equal(calls.update, 1);
  assert.equal(calls.rest, 0);
  await assertPrivateCollection(r.page);
  console.log(
    "PASS fresh-device token-hash recovery, URL cleanup and password update",
  );
  const c = await make("?token_hash=CONFIRM_TEST_TOKEN&type=email");
  last = c.page;
  await c.page.locator(".cloud-status.unbound").waitFor();
  assert.equal(new URL(c.page.url()).search, "");
  await assertPrivateCollection(c.page);
  console.log("PASS cross-browser confirmation without a local PKCE verifier");
  const x = await make("?token_hash=EXPIRED_TEST_TOKEN&type=recovery");
  last = x.page;
  await x.page.locator(".cloud-status.error").waitFor();
  assert.match(
    await x.page.locator(".cloud-status.error").innerText(),
    /verlopen/,
  );
  assert.equal(await x.page.locator('[data-mode="update"]').count(), 0);
  assert.equal(new URL(x.page.url()).search, "");
  await x.page.locator(".cloud-status.error").scrollIntoViewIfNeeded();
  await capture(x.page, "30-email-expired-link");
  console.log(
    "PASS expired link creates no recovery session and is cleaned from URL",
  );
  await click(x.page, "cloud-login");
  await x.page.setViewportSize({ width: 320, height: 844 });
  await x.page.emulateMedia({ colorScheme: "dark" });
  await mode(x.page, "register");
  await capture(x.page, "31-email-small-dark");
  assert.equal(
    await x.page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.equal(
    await x.page
      .locator("#modal")
      .evaluate((el) => el.scrollWidth > el.clientWidth),
    false,
  );
  console.log("PASS narrow dark-mode email dialog without overflow");
  assert.equal(calls.rest, 0);
  assert.deepEqual(errors, []);
} catch (error) {
  console.error(error);
  if (last) await last.screenshot({ path: outputFile("EMAIL-FAIL.png") });
  process.exitCode = 1;
}
for (const c of contexts) await c.close();
await browser.close();
process.exit(process.exitCode ?? 0);
