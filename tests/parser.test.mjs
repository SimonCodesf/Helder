import test from "node:test";
import assert from "node:assert/strict";
import {
  parseImport,
  parseDelimited,
  parseMarkdown,
  validateNote,
  toTSV,
  toMarkdown,
  splitTags,
} from "../src/parser.js";
import { markdown } from "../src/markdown.js";
import { safeURL, normalize, stripImages } from "../src/utils.js";
const basic = {
  front: "Vraag",
  back: "Een antwoord.",
  kind: "basic",
  tags: [],
  hint: "",
  explain: "",
  source: "",
};
test("Quizlet TSV and optional header", () => {
  assert.equal(
    parseImport("Term\tDefinitie\nKennis\tEen onderbouwd weten.").notes[0]
      .front,
    "Kennis",
  );
});
test("CSV quoted commas, quotes and multiline answers", () => {
  const r = parseImport(
    'Term,Definitie\n"Kennis, zeker?","Eerste regel\nHij zei ""ja""."',
    "csv",
  );
  assert.equal(r.notes[0].front, "Kennis, zeker?");
  assert.equal(r.notes[0].back, 'Eerste regel\nHij zei "ja".');
});
test("CRLF and UTF-8 BOM are accepted", () => {
  assert.equal(
    parseImport("\uFEFFTerm\tDefinitie\r\nA\tB\r\n").notes.length,
    1,
  );
});
test("Unclosed CSV quote is explicit", () =>
  assert.throws(
    () => parseImport('Vraag,"Antwoord', "csv"),
    /niet afgesloten/,
  ));
test("Invalid CSV characters after quote are explicit", () =>
  assert.throws(() => parseDelimited('"x"y,z', ","), /Onverwacht/));
test("Missing delimiter/answer is not silently imported", () =>
  assert.throws(
    () => parseImport("Een regel zonder delimiter", "tsv"),
    /kolommen/,
  ));
test("Markdown title, map, description, metadata and bold answer", () => {
  const r = parseMarkdown(
    "# Test\nmap: School::Filosofie\nbeschrijving: Een begin\n\n## Vraag\ntags: H1, niveau::1\nhint: Denk na\nuitleg: Geef een voorbeeld\nbron: https://example.org\n\nEen **kern**.",
  );
  assert.equal(r.title, "Test");
  assert.equal(r.folderPath, "School::Filosofie");
  assert.deepEqual(r.notes[0].tags, ["H1", "niveau::1"]);
  assert.equal(r.notes[0].explain, "Geef een voorbeeld");
});
test("Markdown code containing headings is not split", () => {
  const r = parseMarkdown("## Vraag\n```\n## Geen nieuwe kaart\n---\n```");
  assert.equal(r.notes.length, 1);
});
test("Unclosed Markdown code is explicit", () =>
  assert.throws(
    () => parseMarkdown("## Vraag\n```\ncode"),
    /Sluit het codeblok/,
  ));
test("Markdown cards work without separator", () =>
  assert.equal(parseMarkdown("## A\nB\n## C\nD").notes.length, 2));
test("Exact duplicates within input are removed, variants kept", () => {
  const r = parseImport("A\tB\nA\tB\nA\tC");
  assert.equal(r.notes.length, 2);
  assert.equal(r.duplicates, 1);
});
test("Multiple tags, duplicate tags and hashes", () =>
  assert.deepEqual(splitTags("#logica, logica; niveau::1"), [
    "logica",
    "niveau::1",
  ]));
test("Cloze note accepts empty extra explanation and hint", () => {
  const r = parseMarkdown(
    "## Kennis is {{c1::weten::werkwoord}}.\ntype: cloze",
  );
  assert.equal(r.notes[0].back, "");
});
test("Cloze malformed/nested codes are rejected", () => {
  assert.throws(() => validateNote({ ...basic, kind: "cloze" }), /Invulkaart/);
  assert.throws(
    () => validateNote({ ...basic, kind: "cloze", front: "{{c1::{{c2::X}}}}" }),
    /geneste/,
  );
});
test("TSV full content round-trip", () => {
  const n = {
    ...basic,
    front: "Vraag\nregel 2",
    back: 'Komma, "quote"\nen een tab\t!',
    hint: "Aanwijzing",
    kind: "reverse",
    tags: ["H1", "niveau::2"],
    explain: "Waarom?",
    source: "https://example.org",
  };
  assert.deepEqual(parseImport(toTSV([n]), "tsv").notes, [n]);
});
test("Markdown export round-trip for ordinary cards", () => {
  const n = { ...basic, hint: "Denk na", tags: ["logica"] };
  assert.equal(
    parseMarkdown(
      toMarkdown({ title: "Set", description: "Kort" }, [n], "School"),
    ).notes[0].hint,
    "Denk na",
  );
});
test("HTML cannot execute in rendered Markdown", () => {
  const html = markdown(
    "<script>alert(1)</script>\n<img src=x onerror=alert(2)>",
  );
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<img"));
});
test("Only http(s) links become links", () => {
  assert.equal(safeURL("javascript:alert(1)"), null);
  assert.equal(safeURL("https://example.org"), "https://example.org/");
  assert.ok(!markdown("[klik](javascript:alert(1))").includes("href="));
});
test("Markdown images render remote https pictures only", () => {
  const html = markdown(
    "Zie dit:\n\n![slagboom](https://example.org/boom.png)",
  );
  assert.ok(html.includes('<img src="https://example.org/boom.png"'));
  assert.ok(html.includes('alt="slagboom"'));
  assert.ok(html.includes('loading="lazy"'));
  assert.ok(
    !markdown("![onveilig](http://example.org/a.png)").includes("<img"),
  );
  assert.ok(
    !markdown("![klik](javascript:alert(1))").includes("<img"),
  );
  const hostile = markdown(
    '![x](https://example.org/a.png" onerror="alert(1)',
  );
  assert.ok(!hostile.includes("<img"));
  assert.ok(!hostile.includes('onerror="'));
  assert.ok(
    !markdown('![a" onerror="x](https://example.org/a.png)').includes(
      'onerror="',
    ),
  );
});
test("Code is escaped and formatting stays available", () => {
  const html = markdown("**vet** en *cursief*\n\n- item\n- nog een\n\n`<b>`");
  assert.ok(html.includes("<strong>vet</strong>"));
  assert.ok(html.includes("<ul>"));
  assert.ok(html.includes("&lt;b&gt;"));
});
test("Search normalizes accents and punctuation", () =>
  assert.equal(normalize("Épistémologie: wat?"), "epistemologie wat"));

test("Cloze requires a nonempty answer, not only a hint", () => {
  assert.throws(
    () => validateNote({ ...basic, kind: "cloze", front: "{{c1::   }}" }),
    /mist het antwoord/,
  );
  assert.throws(
    () => validateNote({ ...basic, kind: "cloze", front: "{{c1::::hint}}" }),
    /mist het antwoord/,
  );
});

test("List titles hide raw image code", () => {
  assert.equal(
    stripImages("![blad](https://example.org/b.png) ![schors](https://example.org/s.png)"),
    "[blad] [schors]",
  );
  assert.equal(stripImages("![](https://example.org/b.png)"), "[afbeelding]");
  assert.equal(stripImages("Gewone vraag?"), "Gewone vraag?");
});

test("Prose before the first card joins the set description", () => {
  const out = parseMarkdown(
    "# Titel\nbeschrijving: Kort.\n\n**Leeswijzer:** eerst dit.\n\n## Vraag\n\nAntwoord\n",
  );
  assert.equal(out.notes.length, 1);
  assert.ok(out.description.includes("Kort."));
  assert.ok(out.description.includes("eerst dit"));
});
