// Gedeelde schil voor blogpagina's: nav + footer + stijl, conform design-spec
// (Syne-koppen, IBM Plex Sans, tokenkleuren, ~72ch leesbreedte).
export default function BlogShell({ children }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        :root { --bg:#111318; --card:#20242F; --border:#2E3347; --yellow:#F5C518;
                --green:#27AE60; --text:#ECEEF5; --muted:#9BA3B8; --soft:#C2C8D8; }
        body { background:var(--bg); color:var(--text); margin:0;
               font-family:'IBM Plex Sans',sans-serif; }
        .b-nav { display:flex; align-items:center; gap:14px; padding:18px 5vw;
                 border-bottom:1px solid var(--border); }
        .b-logo { display:flex; align-items:center; gap:10px; text-decoration:none; color:var(--text); font-weight:700; }
        .b-nav a.b-link { margin-left:auto; color:var(--soft); text-decoration:none; font-size:14px; min-height:48px; display:inline-flex; align-items:center; }
        .b-nav a.b-cta { background:var(--yellow); color:#000; font-weight:700; border-radius:12px;
                 padding:0 18px; min-height:48px; display:inline-flex; align-items:center; text-decoration:none; font-size:15px; }
        .b-main { max-width:72ch; margin:0 auto; padding:40px 20px 64px; }
        .b-main h1 { font-family:'Syne',sans-serif; font-weight:800; font-size:clamp(28px,5vw,42px);
                     line-height:1.15; letter-spacing:-0.5px; margin:10px 0 14px; }
        .b-main h2 { font-family:'Syne',sans-serif; font-weight:700; font-size:clamp(20px,3vw,26px); margin:34px 0 10px; }
        .b-main h3 { font-size:18px; margin:26px 0 8px; }
        .b-main p, .b-main li { font-size:17px; line-height:1.75; color:var(--soft); }
        .b-main p strong { color:var(--text); }
        .b-main a { color:var(--yellow); }
        .b-main blockquote { border-left:3px solid var(--yellow); margin:26px 0; padding:6px 0 6px 18px;
                             font-size:19px; font-style:italic; color:var(--text); }
        .b-main figure { margin:24px 0 0; }
        .b-main figure img { width:100%; border-radius:14px; border:1px solid var(--border); }
        .b-kicker { font-size:12px; letter-spacing:1.5px; text-transform:uppercase; color:var(--yellow); font-weight:700; }
        .b-meta { font-size:13px; color:var(--muted); margin-bottom:8px; }
        .b-bron { font-size:13px; color:var(--muted); font-style:italic; }
        .b-kaart { display:block; background:var(--card); border:1px solid var(--border); border-radius:14px;
                   padding:22px; margin-bottom:16px; text-decoration:none; color:var(--text); }
        .b-kaart:hover { border-color:var(--yellow); }
        .b-kaart h2 { font-family:'Syne',sans-serif; font-size:22px; margin:6px 0 8px; }
        .b-kaart p { color:var(--soft); font-size:15px; line-height:1.6; margin:0 0 8px; }
        .b-tags { display:flex; gap:8px; flex-wrap:wrap; }
        .b-tag { font-size:12px; color:var(--yellow); background:#2A240A; border-radius:20px; padding:4px 11px; }
        .b-bio { display:flex; gap:14px; align-items:center; background:var(--card); border:1px solid var(--border);
                 border-radius:14px; padding:16px 18px; margin-top:34px; font-size:14px; color:var(--soft); }
        .b-ctablok { background:var(--card); border:1px solid var(--yellow); border-radius:14px;
                     padding:22px; margin-top:18px; }
        .b-ctablok a { display:inline-flex; align-items:center; min-height:52px; padding:0 22px; background:var(--yellow);
                       color:#000; font-weight:700; border-radius:12px; text-decoration:none; margin-top:10px; }
        footer.b-footer { padding:32px 5vw; border-top:1px solid var(--border); display:flex;
                          justify-content:space-between; flex-wrap:wrap; gap:16px; font-size:14px; color:var(--muted); }
        footer.b-footer a { color:var(--soft); text-decoration:none; margin-left:20px; }
        @media (max-width:520px){ .b-nav a.b-link{display:none} }
      `}</style>
      <nav className="b-nav">
        <a className="b-logo" href="/landing" aria-label="YourWkb home">
          <svg width="34" height="34" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#F5C518"/><path d="M13 4.5 L5.5 13.5 h5 l-.8 6 L18.5 10.5 h-5 l.7-6 z" fill="#000"/></svg>
          YourWkb <span style={{color:"var(--muted)",fontWeight:400}}>· blog</span>
        </a>
        <a className="b-link" href="/blog">Alle artikelen</a>
        <a className="b-cta" href="/app">Open de app</a>
      </nav>
      <main className="b-main">{children}</main>
      <footer className="b-footer">
        <p>© {new Date().getFullYear()} BlauweVisie B.V. · yourwkb.nl</p>
        <div>
          <a href="/landing">Home</a>
          <a href="https://www.linkedin.com/company/yourwkb" target="_blank" rel="noopener">LinkedIn</a>
          <a href="/avg">Privacy &amp; AVG</a>
        </div>
      </footer>
    </>
  );
}
