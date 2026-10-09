import { normalize } from "./utils.js?v=3.1.32";
import { validateLearning } from "./learning.js?v=3.1.32";
export class ImportError extends Error {
  constructor(message) {
    super(message);
    this.name = "ImportError";
  }
}
export const splitTags = (text) => [
  ...new Set(
    String(text ?? "")
      .split(/[,;\n]+/)
      .map((v) => v.trim().replace(/^#/, ""))
      .filter(Boolean),
  ),
];
export const clozeMatches = (text) => [
  ...String(text).matchAll(/\{\{c([1-9]\d*)::([^{}]+?)\}\}/g),
];
export function validateNote(note) {
  validateLearning(note.learning);
  if (!String(note.front ?? "").trim())
    throw new ImportError("Een kaart mist een vraag of term.");
  if (!["basic", "reverse", "cloze"].includes(note.kind))
    throw new ImportError("Onbekend kaarttype.");
  if (note.kind === "cloze") {
    const matches = clozeMatches(note.front);
    if (matches.some((match) => !match[2].split("::")[0].trim()))
      throw new ImportError(
        "Een invulcode mist het antwoord. Gebruik {{c1::antwoord}}.",
      );
    if (!matches.length)
      throw new ImportError(
        "Invulkaart: voeg minstens één {{c1::antwoord}} toe aan de voorkant.",
      );
    const stripped = String(note.front).replace(
      /\{\{c([1-9]\d*)::([^{}]+?)\}\}/g,
      "",
    );
    if (stripped.includes("{{c"))
      throw new ImportError(
        "Ongeldige of geneste invulcode. Gebruik {{c1::antwoord::hint}} zonder geneste codes.",
      );
  } else if (!String(note.back ?? "").trim())
    throw new ImportError("Een gewone kaart mist het antwoord.");
  for (const field of ["front", "back", "hint", "explain", "source"])
    if (String(note[field] ?? "").length > 50000)
      throw new ImportError(
        "Een kaartveld is te lang (maximum 50.000 tekens).",
      );
  return note;
}
export function parseDelimited(text, separator = "\t") {
  const rows = [];
  let row = [],
    field = "",
    quoted = false,
    closed = false;
  const input = String(text)
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n");
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
        closed = true;
      } else field += c;
    } else if (c === '"' && field.length === 0 && !closed) quoted = true;
    else if (c === separator) {
      row.push(field);
      field = "";
      closed = false;
    } else if (c === "\n") {
      row.push(field);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      field = "";
      closed = false;
    } else {
      if (closed && c.trim())
        throw new ImportError(
          `Onverwacht teken na een geciteerd veld (regel ${rows.length + 1}).`,
        );
      if (!closed) field += c;
    }
  }
  if (quoted) throw new ImportError("Een aanhalingsteken is niet afgesloten.");
  row.push(field);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}
export function parseTable(text, format = "tsv") {
  let rows = parseDelimited(text, format === "csv" ? "," : "\t");
  if (!rows.length) throw new ImportError("Geen kaarten gevonden.");
  const heads = rows[0].map(normalize);
  if (
    ["term", "vraag", "front", "question"].includes(heads[0]) &&
    ["definitie", "antwoord", "back", "answer", "definition"].includes(heads[1])
  )
    rows = rows.slice(1);
  const notes = rows.map((row, index) => {
    if (row.length < 2 || row.length > 8)
      throw new ImportError(
        `Regel ${index + 1}: verwacht 2 tot 8 kolommen. Gebruik een tab tussen term en antwoord, of kies CSV.`,
      );
    return validateNote({
      front: row[0].trim(),
      back: row[1].trim(),
      tags: splitTags(row[2]),
      hint: row[3]?.trim() ?? "",
      kind: row[4]?.trim() || "basic",
      explain: row[5]?.trim() ?? "",
      source: row[6]?.trim() ?? "",
      ...(row[7]?.trim() ? { learning: parseLearningJSON(row[7]) } : {}),
    });
  });
  return { title: "", description: "", folderPath: "", notes };
}
export function parseMarkdown(text) {
  const result = { title: "", description: "", folderPath: "", notes: [] };
  let exercise = null,
    exerciseLines = [],
    card = null,
    answer = [],
    inCode = false;
  const finish = () => {
    if (card) {
      card.back = answer.join("\n").trim();
      result.notes.push(validateNote(card));
      card = null;
      answer = [];
    }
  };
  for (const raw of String(text)
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")) {
    if (!inCode && exercise) {
      if (raw.trim() === ":::") {
        card.learning ??= {};
        card.learning[exercise === "herkennen" ? "choice" : "application"] =
          parseExercise(exercise, exerciseLines);
        exercise = null;
        exerciseLines = [];
      } else exerciseLines.push(raw);
      continue;
    }
    const exerciseStart = !inCode && /^:::(herkennen|toepassen)\s*$/.exec(raw);
    if (exerciseStart) {
      if (!card)
        throw new ImportError("Een oefening hoort onder een kaart (## Vraag).");
      exercise = exerciseStart[1];
      continue;
    }
    if (/^```/.test(raw)) {
      inCode = !inCode;
      if (card) answer.push(raw);
      continue;
    }
    if (!inCode) {
      const title = /^#\s+(.+)$/.exec(raw);
      if (title && !card && !result.notes.length) {
        result.title = title[1].trim();
        continue;
      }
      const question = /^##\s+(.+)$/.exec(raw);
      if (question) {
        finish();
        card = {
          front: question[1].trim(),
          back: "",
          tags: [],
          hint: "",
          kind: "basic",
          explain: "",
          source: "",
        };
        continue;
      }
      if (/^\s*---\s*$/.test(raw)) {
        finish();
        continue;
      }
      const meta =
        /^(map|beschrijving|structuur|tags|hint|type|uitleg|bron|verken-term):\s*(.*)$/i.exec(
          raw,
        );
      if (meta) {
        const key = meta[1].toLowerCase(),
          value = meta[2].trim();
        if (!card) {
          if (key === "structuur") {
            try {
              result.curriculum = JSON.parse(value);
            } catch {
              throw new ImportError(
                "Structuur: gebruik een geldig JSON-object.",
              );
            }
          } else if (key === "map") result.folderPath = value;
          else if (key === "beschrijving") result.description = value;
          else throw new ImportError(`${key}: staat buiten een kaart.`);
        } else if (key === "tags") card.tags = splitTags(value);
        else if (key === "type")
          card.kind =
            { basis: "basic", omgekeerd: "reverse", invul: "cloze" }[value] ??
            value;
        else if (key === "hint") card.hint = value;
        else if (key === "uitleg") card.explain = value;
        else if (key === "bron") card.source = value;
        else if (key === "verken-term") (card.learning ??= {}).term = value;
        else answer.push(raw);
        continue;
      }
    }
    if (card) answer.push(raw);
    else if (raw.trim())
      throw new ImportError(
        "Begin een kaart met ## Vraag. Een setnaam begint met # Setnaam.",
      );
  }
  if (exercise) throw new ImportError("Sluit je extra oefening af met :::.");
  if (inCode)
    throw new ImportError(
      "Sluit het codeblok af met ``` voordat je importeert.",
    );
  finish();
  if (!result.notes.length)
    throw new ImportError(
      "Geen kaarten gevonden. Begin elke kaart met ## Vraag.",
    );
  return result;
}
export function parseImport(text, format = "auto") {
  if (String(text).length > 5_000_000)
    throw new ImportError(
      "Dit tekstbestand is te groot (maximum 5 MB). Splits het in kleinere sets.",
    );
  if (format === "auto")
    format = /^##?\s/m.test(text)
      ? "markdown"
      : String(text).includes("\t")
        ? "tsv"
        : "csv";
  const result =
    format === "markdown" ? parseMarkdown(text) : parseTable(text, format);
  if (result.notes.length > 10000)
    throw new ImportError("Importeer maximaal 10.000 kaarten tegelijk.");
  const seen = new Set();
  let duplicates = 0;
  result.notes = result.notes.filter((note) => {
    const key = noteImportKey(note);
    if (seen.has(key)) {
      duplicates++;
      return false;
    }
    seen.add(key);
    return true;
  });
  result.duplicates = duplicates;
  return result;
}
export function toMarkdown(set, notes, folderPath = "") {
  return (
    `# ${set.title}\n${folderPath ? `map: ${folderPath}\n` : ""}${set.description ? `beschrijving: ${set.description.replace(/\n/g, " ")}\n` : ""}${set.curriculum ? `structuur: ${JSON.stringify(set.curriculum)}\n` : ""}\n` +
    notes
      .map(
        (n) =>
          `## ${n.front.replace(/\n/g, " ")}\n${n.kind !== "basic" ? `type: ${n.kind}\n` : ""}${n.tags.length ? `tags: ${n.tags.join(", ")}\n` : ""}${n.hint ? `hint: ${n.hint.replace(/\n/g, " ")}\n` : ""}${n.explain ? `uitleg: ${n.explain.replace(/\n/g, " ")}\n` : ""}${n.source ? `bron: ${n.source}\n` : ""}${n.learning?.term ? `verken-term: ${n.learning.term}\n` : ""}\n${n.back}\n${exerciseMarkdown(n.learning)}`,
      )
      .join("\n---\n\n")
  );
}
export function toTSV(notes) {
  const quote = (value) =>
    /[\t\n"]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
  return [
    "Term\tDefinitie\tTags\tHint\tType\tUitleg\tBron\tOefeningen",
    ...notes.map((n) =>
      [
        n.front,
        n.back,
        n.tags.join(", "),
        n.hint,
        n.kind,
        n.explain,
        n.source,
        n.learning ? JSON.stringify(n.learning) : "",
      ]
        .map((v) => quote(v ?? ""))
        .join("\t"),
    ),
  ].join("\n");
}

function parseExercise(type, lines) {
  if (type === "herkennen") {
    const choice = { prompt: "", options: [], correct: -1, feedback: "" };
    for (const line of lines) {
      const item = /^- \[([ xX])\] (.+)$/.exec(line);
      if (item) {
        if (item[1].toLowerCase() === "x") {
          if (choice.correct >= 0)
            throw new ImportError("Kies één juist antwoord met [x].");
          choice.correct = choice.options.length;
        }
        choice.options.push(item[2].trim());
      } else if (line.startsWith("vraag:"))
        choice.prompt = line.slice(6).trim();
      else if (line.startsWith("uitleg:"))
        choice.feedback = line.slice(7).trim();
      else if (line.trim())
        throw new ImportError(
          "Herkennen: gebruik vraag:, - [x] juist, - [ ] afleider en uitleg:.",
        );
    }
    validateLearning({ choice });
    return choice;
  }
  const application = { prompt: "", answer: "", rubric: [] };
  let section = "";
  const answer = [];
  for (const line of lines) {
    if (line.startsWith("vraag:")) application.prompt = line.slice(6).trim();
    else if (line.startsWith("antwoord:")) {
      section = "answer";
      if (line.slice(9).trim()) answer.push(line.slice(9).trim());
    } else if (line.trim() === "kernpunten:") section = "rubric";
    else if (section === "rubric" && line.startsWith("- "))
      application.rubric.push(line.slice(2).trim());
    else if (section === "answer") answer.push(line);
    else if (line.trim())
      throw new ImportError(
        "Toepassen: gebruik vraag:, antwoord: en optioneel kernpunten:.",
      );
  }
  application.answer = answer.join("\n").trim();
  validateLearning({ application });
  return application;
}
function exerciseMarkdown(learning) {
  if (!learning) return "";
  let out = "";
  if (learning.choice) {
    const c = learning.choice;
    out += `\n:::herkennen\nvraag: ${c.prompt}\n${c.options.map((v, i) => "- [" + (i === c.correct ? "x" : " ") + "] " + v).join("\n")}\n${c.feedback ? "uitleg: " + c.feedback + "\n" : ""}:::\n`;
  }
  if (learning.application) {
    const a = learning.application;
    out += `\n:::toepassen\nvraag: ${a.prompt}\nantwoord:\n${a.answer}\n${a.rubric?.length ? "kernpunten:\n" + a.rubric.map((v) => "- " + v).join("\n") + "\n" : ""}:::\n`;
  }
  return out;
}

function parseLearningJSON(text) {
  try {
    const value = JSON.parse(text);
    validateLearning(value);
    return value;
  } catch (error) {
    throw new ImportError("Oefeningen-kolom: " + error.message);
  }
}
export function noteImportKey(n) {
  return JSON.stringify([
    n.kind,
    n.front.trim(),
    n.back?.trim() ?? "",
    (n.tags ?? []).slice().sort(),
    n.hint ?? "",
    n.explain ?? "",
    n.source ?? "",
    n.learning ?? null,
  ]);
}
