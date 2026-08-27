// Blogindex — nieuwste eerst, als kaarten (blogspec aug 2026).
import BlogShell from "./BlogShell";
import { allePosts } from "../../lib/blog";

export const metadata = {
  title: "Blog — YourWkb",
  description: "Artikelen en nieuws over het Wkb-opleverrapport, NEN 1010 en het meterkastpaspoort — voor installateurs die de regie pakken.",
  alternates: { canonical: "https://yourwkb.nl/blog" },
  openGraph: {
    title: "Blog — YourWkb",
    description: "Artikelen en nieuws over het Wkb-opleverrapport, NEN 1010 en het meterkastpaspoort.",
    url: "https://yourwkb.nl/blog",
    siteName: "YourWkb",
    locale: "nl_NL",
    type: "website",
    images: [{ url: "https://yourwkb.nl/og-cover.png", width: 1200, height: 630, alt: "YourWkb blog" }],
  },
  twitter: { card: "summary_large_image", images: ["https://yourwkb.nl/og-cover.png"] },
  robots: { index: true, follow: true },
};

const fmtDatum = (iso) =>
  new Date(iso + "T12:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });

export default function BlogIndex() {
  const posts = allePosts();
  return (
    <BlogShell>
      <p className="b-kicker">Blog</p>
      <h1>Artikelen &amp; nieuws</h1>
      <p style={{ marginBottom: 28 }}>Over het Wkb-opleverrapport, NEN 1010 en het meterkastpaspoort — voor installateurs die de regie pakken.</p>
      {posts.map((p) => (
        <a key={p.slug} className="b-kaart" href={`/blog/${p.slug}`}>
          <p className="b-meta">{fmtDatum(p.date)} · {p.author}</p>
          <h2>{p.title}</h2>
          <p>{p.description}</p>
          <div className="b-tags">{(p.tags || []).map((t) => <span key={t} className="b-tag">{t}</span>)}</div>
        </a>
      ))}
    </BlogShell>
  );
}
