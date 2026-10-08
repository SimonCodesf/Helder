// Actual local Postgres/PGlite. Controlled auth.uid() claims, not live JWT verification.
const { PGlite } = await import(
  process.env.PGLITE_MODULE || "@electric-sql/pglite"
);
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { emptyCollection } from "../src/model.js";
import { cloudSnapshot } from "../src/sync-core.js";
const db = new PGlite();
await db.exec(
  `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;insert into auth.users values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');`,
);
await db.exec(
  await fs.readFile(
    new URL("../backend/supabase.sql", import.meta.url),
    "utf8",
  ),
);
const data = cloudSnapshot(emptyCollection());
const as = async (role, id) => {
  await db.exec(
    `reset role;set role ${role};set request.jwt.claim.sub = '${id}';`,
  );
};
try {
  await as("authenticated", "11111111-1111-4111-8111-111111111111");
  let result = await db.query(
    "select public.helder_push($1::jsonb,$2) as result",
    [JSON.stringify(data), 0],
  );
  assert.deepEqual(result.rows[0].result, { ok: true, revision: 1 });
  console.log("PASS authenticated first-write RPC");
  result = await db.query("select public.helder_push($1::jsonb,$2) as result", [
    JSON.stringify(data),
    0,
  ]);
  assert.equal(result.rows[0].result.ok, false);
  console.log("PASS stale-revision push rejected without overwrite");
  assert.equal(
    (await db.query("select * from public.helder_collections")).rows.length,
    1,
  );
  await assert.rejects(
    db.query("update public.helder_collections set revision=99"),
  );
  console.log("PASS direct table write denied");
  await as("authenticated", "22222222-2222-4222-8222-222222222222");
  assert.equal(
    (await db.query("select * from public.helder_collections")).rows.length,
    0,
  );
  console.log("PASS another account cannot read owner data");
  await db.query("select public.helder_push($1::jsonb,$2)", [
    JSON.stringify(data),
    0,
  ]);
  assert.equal(
    (await db.query("select * from public.helder_collections")).rows.length,
    1,
  );
  console.log("PASS separate account receives separate empty collection");
  await as("anon", "");
  await assert.rejects(db.query("select * from public.helder_collections"));
  await assert.rejects(
    db.query("select public.helder_push($1::jsonb,$2)", [
      JSON.stringify(data),
      0,
    ]),
  );
  console.log("PASS anonymous reads/writes denied");
  await as("authenticated", "11111111-1111-4111-8111-111111111111");
  await assert.rejects(
    db.query("select public.helder_push($1::jsonb,$2)", ["{}", 1]),
  );
  console.log("PASS malformed payload rejected");
} finally {
  await db.close();
}
