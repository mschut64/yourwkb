"use client";
// Deelknoppen per blogspec: LinkedIn/Facebook/WhatsApp/X + kopieer-link,
// met UTM per kanaal en PostHog-event blog_gedeeld { kanaal, slug }.
import { useState } from "react";

export default function Deelknoppen({ slug, titel }) {
  const [gekopieerd, setGekopieerd] = useState(false);
  const basis = `https://yourwkb.nl/blog/${slug}`;
  const utm = (kanaal) => `${basis}?utm_source=${kanaal}&utm_medium=social&utm_campaign=blog`;
  const log = (kanaal) => { try { window.posthog?.capture("blog_gedeeld", { kanaal, slug }); } catch {} };

  const knoppen = [
    ["LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(utm("linkedin"))}`],
    ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(utm("facebook"))}`],
    ["WhatsApp", `https://wa.me/?text=${encodeURIComponent(titel + " — " + utm("whatsapp"))}`],
    ["X", `https://twitter.com/intent/tweet?text=${encodeURIComponent(titel)}&url=${encodeURIComponent(utm("x"))}`],
  ];

  const stijl = { display:"inline-flex", alignItems:"center", minHeight:48, padding:"0 16px",
                  borderRadius:12, border:"1px solid #3E4459", background:"#1A1D25",
                  color:"#ECEEF5", fontSize:14, fontWeight:600, textDecoration:"none",
                  cursor:"pointer", fontFamily:"inherit" };

  return (
    <div style={{ marginTop: 34 }}>
      <p style={{ fontSize:12, letterSpacing:1.5, textTransform:"uppercase", color:"#9BA3B8", fontWeight:700 }}>Deel dit artikel</p>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
        {knoppen.map(([naam, url]) => (
          <a key={naam} style={stijl} href={url} target="_blank" rel="noopener" onClick={() => log(naam.toLowerCase())}>{naam}</a>
        ))}
        <button style={stijl} onClick={async () => {
          try { await navigator.clipboard.writeText(basis); setGekopieerd(true); setTimeout(()=>setGekopieerd(false), 2000); } catch {}
          log("kopieer");
        }}>{gekopieerd ? "✓ Gekopieerd" : "Kopieer link"}</button>
      </div>
      <p style={{ fontSize:12, color:"#9BA3B8", marginTop:10 }}>
        Instagram kent geen deel-link — zet de link in je bio of deel de coverafbeelding.
      </p>
    </div>
  );
}
