import { escapeHTML, safeURL } from "./utils.js?v=3.1.21";
// Deliberately small Markdown subset. Raw HTML is ALWAYS escaped, never executed.
function inline(text) {
  const placeholders = [];
  const token = (html) => {
    placeholders.push(html);
    return `\u0000${placeholders.length - 1}\u0000`;
  };
  let value = String(text).replace(/`([^`\n]+)`/g, (_, code) =>
    token(`<code>${escapeHTML(code)}</code>`),
  );
  value = value.replace(/\[([^\]\n]+)\]\(([^\s)]+)\)/g, (_, label, url) => {
    const safe = safeURL(url);
    return token(
      safe
        ? `<a href="${escapeHTML(safe)}" target="_blank" rel="noopener noreferrer">${escapeHTML(label)}</a>`
        : escapeHTML(label),
    );
  });
  value = escapeHTML(value)
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");
  return value.replace(/\u0000(\d+)\u0000/g, (_, i) => placeholders[Number(i)]);
}
export function markdown(text = "") {
  const lines = String(text).replace(/\r\n?/g, "\n").split("\n");
  let result = "",
    paragraph = [],
    list = [],
    code = [],
    inCode = false;
  const flush = () => {
    if (paragraph.length) {
      result += `<p>${paragraph.map(inline).join("<br>")}</p>`;
      paragraph = [];
    }
    if (list.length) {
      result += `<ul>${list.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`;
      list = [];
    }
  };
  for (const line of lines) {
    if (/^```/.test(line)) {
      flush();
      if (inCode) {
        result += `<pre><code>${escapeHTML(code.join("\n"))}</code></pre>`;
        code = [];
      }
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      code.push(line);
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    const heading = /^#{1,4}\s+(.+)$/.exec(line);
    if (heading) {
      flush();
      result += `<h3>${inline(heading[1])}</h3>`;
      continue;
    }
    const bullet = /^\s*[-*]\s+(.+)$/.exec(line);
    if (bullet) {
      if (paragraph.length) flush();
      list.push(bullet[1]);
      continue;
    }
    if (list.length) flush();
    paragraph.push(line);
  }
  flush();
  if (inCode)
    result += `<pre><code>${escapeHTML(code.join("\n"))}</code></pre>`;
  return result;
}
