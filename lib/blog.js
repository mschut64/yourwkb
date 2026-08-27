// Blog-bibliotheek (blogspec aug 2026): markdown-bestanden met front-matter in
// content/blog/, zonder externe dependencies. De mini-renderer dekt wat een
// vakartikel nodig heeft: koppen, alinea's, lijsten, citaten, vet/cursief, links.
import fs from "fs";
import path from "path";

const MAP = path.join(process.cwd(), "content", "blog");

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const regel of m[1].split("\n")) {
    const i = regel.indexOf(":");
    if (i < 0) continue;
    const k = regel.slice(0, i).trim();
    let v = regel.slice(i + 1).trim();
    if (v.startsWith("[")) v = v.slice(1, -1).split(",").map(x => x.trim()).filter(Boolean);
    meta[k] = v;
  }
  return { meta, body: raw.slice(m[0].length) };
}

function inlineMd(t) {
  return t
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g,
      '<a href="$2">$1</a>');
}

export function mdNaarHtml(body) {
  const blokken = body.trim().split(/\n\s*\n/);
  return blokken.map(b => {
    const r = b.trim();
    if (r.startsWith("### ")) return `<h3>${inlineMd(r.slice(4))}</h3>`;
    if (r.startsWith("## "))  return `<h2>${inlineMd(r.slice(3))}</h2>`;
    if (r.startsWith("> "))
      return `<blockquote>${inlineMd(r.split("\n").map(x=>x.replace(/^>\s?/,"")).join(" "))}</blockquote>`;
    if (/^[-*] /.test(r))
      return `<ul>${r.split("\n").map(x=>`<li>${inlineMd(x.replace(/^[-*] /,""))}</li>`).join("")}</ul>`;
    if (/^\d+\. /.test(r))
      return `<ol>${r.split("\n").map(x=>`<li>${inlineMd(x.replace(/^\d+\. /,""))}</li>`).join("")}</ol>`;
    return `<p>${inlineMd(r.replace(/\n/g," "))}</p>`;
  }).join("\n");
}

export function allePosts() {
  if (!fs.existsSync(MAP)) return [];
  return fs.readdirSync(MAP)
    .filter(f => f.endsWith(".md"))
    .map(f => {
      const raw = fs.readFileSync(path.join(MAP, f), "utf-8");
      const { meta, body } = parseFrontmatter(raw);
      return { slug: f.replace(/\.md$/, ""), ...meta, body };
    })
    .filter(p => p.title && p.date)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function eenPost(slug) {
  return allePosts().find(p => p.slug === slug) || null;
}
