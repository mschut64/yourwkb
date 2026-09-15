// Artikelpagina — statisch, met volledige social-preview, JSON-LD Article,
// self-canonical en deelknoppen (blogspec aug 2026).
import { notFound } from "next/navigation";
import BlogShell from "../BlogShell";
import Deelknoppen from "../Deelknoppen";
import ArtikelStats from "../ArtikelStats";
import { allePosts, eenPost, mdNaarHtml } from "../../../lib/blog";

const BASIS = "https://yourwkb.nl";
const abs = (p) => (p?.startsWith("http") ? p : `${BASIS}${p || "/og-cover.png"}`);

export function generateStaticParams() {
  return allePosts().map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }) {
  const post = eenPost(params.slug);
  if (!post) return {};
  const url = `${BASIS}/blog/${post.slug}`;
  return {
    title: `${post.title} — YourWkb`,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url,
      siteName: "YourWkb",
      locale: "nl_NL",
      publishedTime: post.date,
      authors: [post.author],
      images: [{ url: abs(post.coverImage), width: 1200, height: 630, alt: post.coverAlt || post.title }],
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.description, images: [abs(post.coverImage)] },
    robots: { index: true, follow: true },
  };
}

const fmtDatum = (iso) =>
  new Date(iso + "T12:00:00").toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });

export default function Artikel({ params }) {
  const post = eenPost(params.slug);
  if (!post) notFound();
  const url = `${BASIS}/blog/${post.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated || post.date,
    author: { "@type": "Person", name: post.author },
    publisher: { "@type": "Organization", name: "YourWkb", url: BASIS },
    image: abs(post.coverImage),
    mainEntityOfPage: url,
  };
  return (
    <BlogShell>
      <ArtikelStats slug={post.slug} />
      <article>
        {post.source && <p className="b-kicker">{post.kicker || "Reprint"}</p>}
        <h1>{post.title}</h1>
        <p className="b-meta">{post.author} · {fmtDatum(post.date)}{post.source ? <> · <span className="b-bron">{post.source}</span></> : null}</p>
        <p style={{ fontWeight: 600, color: "var(--text)" }}>{post.description}</p>
        {post.coverImage && (
          <figure>
            <img src={post.coverImage} alt={post.coverAlt || post.title} loading="lazy" />
          </figure>
        )}
        <div dangerouslySetInnerHTML={{ __html: mdNaarHtml(post.body.replace(/<!--[\s\S]*?-->/g, "")) }} />
      </article>

      <Deelknoppen slug={post.slug} titel={post.title} />

      <div className="b-bio">
        <svg width="42" height="42" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><rect width="24" height="24" rx="6" fill="#F5C518"/><path d="M13 4.5 L5.5 13.5 h5 l-.8 6 L18.5 10.5 h-5 l.7-6 z" fill="#000"/></svg>
        <span><strong style={{ color: "var(--text)" }}>{post.author}</strong> — oprichter van YourWkb, de app waarmee installatietechnici in minuten een Wkb-opleverrapport en meterkastpaspoort maken. <a href="/landing" style={{ color: "var(--yellow)" }}>yourwkb.nl</a></span>
      </div>

      <div className="b-ctablok">
        <strong style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontWeight: 700, fontSize: 19 }}>Zelf de regie pakken?</strong>
        <p style={{ margin: "6px 0 0" }}>Maak je eerstvolgende oplevering met YourWkb — gratis te proberen, geen account nodig.</p>
        <a href="/app">Probeer YourWkb →</a>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </BlogShell>
  );
}
