// Mock REST/Auth responses only. This does not test a live OAuth provider.
import {
  chromium,
  launchOptions,
  TEST_URL,
  EXAMPLE_FILE,
  outputFile,
} from "./browser-environment.mjs";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const browser = await chromium.launch(launchOptions);
const pages = [];
const docs = new Map(),
  backend = "https://project.example.test",
  id1 = "11111111-1111-4111-8111-111111111111",
  id2 = "22222222-2222-4222-8222-222222222222";
const clone = (v) => structuredClone(v),
  errors = [];
const token = (id) =>
  [
    btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })),
    btoa(
      JSON.stringify({
        sub: id,
        role: "authenticated",
        aud: "authenticated",
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ),
    btoa("MOCK_SIGNATURE_ONLY"),
  ].join(".");
const user = (id) => ({
  id,
  email: "test-" + id.slice(0, 1) + "@example.test",
  aud: "authenticated",
  app_metadata: { provider: "github", providers: ["github"] },
  user_metadata: {},
  created_at: new Date().toISOString(),
});
const make = async (id) => {
  const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      serviceWorkers: "block",
      reducedMotion: "reduce",
    }),
    page = await context.newPage();
  pages.push(page);
  page.on("pageerror", (e) => errors.push(e.message));
  await context.route("**/config.json", (r) =>
    r.fulfill({
      json: {
        supabaseUrl: backend,
        publishableKey: "sb_publishable_LOCAL_MOCK_ONLY",
        providers: ["github"],
      },
    }),
  );
  await context.route(backend + "/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      row = docs.get(id);
    if (url.pathname.startsWith("/rest/v1/helder_collections"))
      return route.fulfill({
        json: row
          ? [
              url.searchParams.get("select") === "revision,updated_at"
                ? {
                    revision: row.revision,
                    updated_at: new Date().toISOString(),
                  }
                : clone(row),
            ]
          : [],
      });
    if (url.pathname === "/rest/v1/rpc/helder_push") {
      const { p_payload, p_expected } = req.postDataJSON();
      if (p_expected !== (row?.revision ?? 0))
        return route.fulfill({
          json: { ok: false, revision: row?.revision ?? 0 },
        });
      const next = {
        revision: (row?.revision ?? 0) + 1,
        payload: clone(p_payload),
      };
      docs.set(id, next);
      return route.fulfill({ json: { ok: true, revision: next.revision } });
    }
    if (url.pathname === "/auth/v1/user")
      return route.fulfill({ json: user(id) });
    if (url.pathname === "/auth/v1/logout")
      return route.fulfill({ status: 204, body: "" });
    return route.fulfill({
      status: 400,
      json: { message: "Unexpected mock endpoint" },
    });
  });
  await page.goto(TEST_URL);
  await page.locator(".welcome-card").waitFor();
  await page.evaluate(
    async ({ id, access, user }) => {
      const r = indexedDB.open("helder-v1");
      const db = await new Promise(
        (resolve) => (r.onsuccess = () => resolve(r.result)),
      );
      await new Promise((resolve) => {
        const t = db.transaction("state", "readwrite");
        t.objectStore("state").put(
          JSON.stringify({
            access_token: access,
            refresh_token: "MOCK_REFRESH",
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            token_type: "bearer",
            user,
          }),
          "device:oauth:sb-project-auth-token",
        );
        t.oncomplete = resolve;
      });
    },
    { id, access: token(id), user: user(id) },
  );
  await page.reload();
  await page.goto(TEST_URL + "/#/settings");
  await page.locator('[data-action="cloud-connect"]').waitFor();
  return { context, page };
};
const collection = (page) =>
  page.evaluate(async () => {
    const r = indexedDB.open("helder-v1");
    const db = await new Promise(
      (resolve) => (r.onsuccess = () => resolve(r.result)),
    );
    return new Promise((resolve) => {
      const q = db.transaction("state").objectStore("state").get("collection");
      q.onsuccess = () => resolve(q.result);
    });
  });
const connect = async (p) => {
  await p.locator('[data-action="cloud-connect"]').click();
  await p.locator('[data-action="confirm"]').click();
  await p.locator(".cloud-status.synced").waitFor();
};
const edit = async (p, index, field, text) => {
  const s = await collection(p);
  await p.goto(TEST_URL + "/#/set/" + s.sets[0].id);
  await p.locator('[data-action="course-tab"][data-view="cards"]').click();
  await p.locator('[data-action="edit-note"]').nth(index).click();
  await p.locator("#note-" + field).fill(text);
  await p.locator('[data-action="save-note"]').click();
  await p.locator("#modal").waitFor({ state: "hidden" });
};
try {
  const a = await make(id1);
  await a.page.locator('[data-action="new-set"]').first().click();
  await a.page
    .locator('[data-action="builder-tab"][data-tab="import"]')
    .click();
  await a.page
    .locator("#import-text")
    .fill(await fs.readFile(EXAMPLE_FILE, "utf8"));
  await a.page
    .locator("#builder-status")
    .filter({ hasText: "5 kaarten klaar" })
    .waitFor();
  await a.page.locator('[data-action="builder-save"]').click();
  await a.page.locator("#modal").waitFor({ state: "hidden" });
  await a.page.locator("#structure-title").waitFor();
  await a.page.goto(TEST_URL + "/#/settings");
  await connect(a.page);
  assert.equal(docs.get(id1).payload.notes.length, 5);
  console.log("PASS explicit opt-in upload via actual SDK and mocked REST");
  const b = await make(id1);
  await connect(b.page);
  assert.equal((await collection(b.page)).notes.length, 5);
  console.log("PASS second device downloads same account collection");
  const other = await make(id2);
  await connect(other.page);
  assert.equal((await collection(other.page)).notes.length, 0);
  console.log(
    "PASS different account remains empty (REST mock; RLS is separately tested in Postgres)",
  );
  await a.context.setOffline(true);
  await b.context.setOffline(true);
  await edit(a.page, 0, "front", "Offline vraag A");
  await edit(b.page, 1, "back", "Offline antwoord B");
  await a.context.setOffline(false);
  await a.page.goto(TEST_URL + "/#/settings");
  await a.page.locator(".cloud-status.synced").waitFor();
  await b.context.setOffline(false);
  await b.page.goto(TEST_URL + "/#/settings");
  await b.page.locator(".cloud-status.synced").waitFor();
  await a.page.locator('[data-action="cloud-sync"]').click();
  await a.page.locator(".cloud-status.synced").waitFor();
  assert.equal((await collection(a.page)).notes[1].back, "Offline antwoord B");
  assert.equal((await collection(b.page)).notes[0].front, "Offline vraag A");
  console.log(
    "PASS different offline edits merged, timestamp metadata does not create false conflict",
  );
  await a.context.setOffline(true);
  await b.context.setOffline(true);
  await edit(a.page, 0, "front", "Eigen keuze A");
  await edit(b.page, 0, "front", "Andere keuze B");
  await a.context.setOffline(false);
  await a.page.goto(TEST_URL + "/#/settings");
  await a.page.locator(".cloud-status.synced").waitFor();
  await b.context.setOffline(false);
  await b.page.goto(TEST_URL + "/#/settings");
  await b.page.locator(".cloud-status.conflict").waitFor();
  await b.page.locator('[data-action="cloud-conflicts"]').click();
  await b.page.locator('input[type="radio"][value="remote"]').check();
  await b.page.screenshot({ path: outputFile("10-conflict-mobile.png") });
  await b.page.locator('[data-action="cloud-resolve"]').click();
  await b.page.locator(".cloud-status.synced").waitFor();
  assert.equal((await collection(b.page)).notes[0].front, "Eigen keuze A");
  console.log(
    "PASS conflicting text pauses and explicit resolution preserves chosen data",
  );
  const astate = await collection(a.page);
  assert.equal(JSON.stringify(astate).includes("MOCK_REFRESH"), false);
  assert.equal(JSON.stringify(docs.get(id1)).includes("MOCK_REFRESH"), false);
  console.log("PASS OAuth tokens absent from collection/remote payload");
  await b.page.locator('[data-action="cloud-logout"]').click();
  await b.page.locator('[data-action="confirm"]').click();
  await b.page.locator(".welcome-card").waitFor();
  assert.equal((await collection(b.page)).notes.length, 0);
  assert.equal(docs.get(id1).payload.notes.length, 5);
  console.log("PASS local logout clears collection without deleting cloud");
  assert.deepEqual(errors, []);
  console.log("PASS no browser runtime errors");
} catch (error) {
  for (const p of pages) {
    console.error(
      "STATE",
      await p
        .locator("#cloud-panel")
        .innerText()
        .catch(() => ""),
    );
    await p.screenshot({ path: outputFile("CLOUD-FAIL.png") }).catch(() => {});
  }
  console.error("ERRORS", errors);
  console.error(error);
  process.exitCode = 1;
}
await browser.close();
process.exit(process.exitCode ?? 0);
