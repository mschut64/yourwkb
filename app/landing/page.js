'use client'
import { useState } from 'react'

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(null)

  const toggleFaq = (i) => setOpenFaq(openFaq === i ? null : i)

  const faqs = [
    { q: 'Moet ik iets installeren?', a: 'Nee. YourWkb is een website die je opent in Safari of Chrome op je telefoon. Je kunt hem toevoegen aan je homescreen — dan ziet het eruit als een app. Geen app store, geen updates.' },
    { q: 'Is het rapport echt NEN1010-compliant?', a: 'Het rapport is gebaseerd op NEN1010 deel 6 en bevat alle verplichte onderdelen: NAW-gegevens, meetapparatuur, eindgroepen-meetstaat met ISO, ΔT en ΔI, impedantie, aardingswaarden en een conformverklaring. Jij bent verantwoordelijk voor de juistheid van de ingevoerde meetwaarden.' },
    { q: 'Hoe lang worden mijn dossiers bewaard?', a: 'Je downloadt de PDF zelf en bent zelf verantwoordelijk voor opslag. Archivering op onze server is inbegrepen bij een definitief rapport (€2,50) en wordt minimaal 10 jaar bewaard — conform de Wkb aansprakelijkheidstermijn.' },
    { q: 'Worden er advertenties getoond of wordt mijn data verkocht?', a: 'Nooit. YourWkb verdient geen geld met advertenties en verkoopt geen data aan derden. Jouw klantgegevens, meetwaarden en projectdata zijn van jou. We verdienen alleen aan definitieve rapporten (€2,50 per stuk). Dat is ons volledige verdienmodel.' },
    { q: 'Werkt het ook voor andere disciplines?', a: 'Ja — groepenkast, zonnepanelen en combiketel zijn nu beschikbaar. Warmtepomp en thuisbatterij volgen binnenkort. Specifieke wensen? Mail naar info@yourwkb.nl.' },
    { q: 'Wat kost het na de testperiode?', a: 'De app blijft altijd gratis. Rapporten zijn nu gratis tijdens de testfase. Daarna betaal je €2,50 per definitief rapport. Je wordt van tevoren op de hoogte gesteld — geen verrassingen.' },
  ]

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --black: #0C0D10; --surface: #13151A; --card: #1A1D24; --border: #2A2E3A;
          --yellow: #F5C518; --yellow2: #E8A800; --green: #22C55E;
          --muted: #6B7080; --text: #E8EAF0; --white: #FFFFFF;
        }
        html { scroll-behavior: smooth; }
        body { background: var(--black); color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 16px; line-height: 1.6; overflow-x: hidden; }
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');

        nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 0 5vw; display: flex; align-items: center; justify-content: space-between; height: 64px; background: rgba(12,13,16,0.9); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); }
        .logo { display: flex; align-items: center; gap: 10px; font-family: 'Syne', sans-serif; font-weight: 800; font-size: 20px; color: var(--white); text-decoration: none; }
        .logo-bolt { width: 32px; height: 32px; border-radius: 8px; background: var(--yellow); display: flex; align-items: center; justify-content: center; font-size: 17px; }
        .nav-right { display: flex; align-items: center; gap: 16px; }
        .nav-link { color: var(--muted); text-decoration: none; font-size: 14px; font-weight: 500; }
        .btn-nav { background: var(--yellow); color: #000; padding: 8px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; text-decoration: none; }

        .hero { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; padding: 100px 5vw 60px; position: relative; overflow: hidden; }
        .hero-bg { position: absolute; inset: 0; background: radial-gradient(ellipse 80% 60% at 60% 40%, rgba(245,197,24,0.07) 0%, transparent 70%); pointer-events: none; }
        .hero-grid { position: absolute; inset: 0; opacity: 0.03; background-image: linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px); background-size: 48px 48px; pointer-events: none; }
        .hero-inner { max-width: 820px; position: relative; z-index: 1; }
        .hero-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(245,197,24,0.1); border: 1px solid rgba(245,197,24,0.3); color: var(--yellow); font-size: 13px; font-weight: 600; padding: 6px 14px; border-radius: 20px; margin-bottom: 28px; }
        .badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--yellow); animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        h1 { font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(30px, 6vw, 54px); line-height: 1.12; letter-spacing: -1px; color: var(--white); margin-bottom: 24px; word-break: keep-all; overflow-wrap: normal; hyphens: none; }
        h1 span { color: var(--yellow); }
        .hero-sub { font-size: clamp(16px, 2vw, 19px); color: var(--muted); max-width: 520px; margin-bottom: 40px; line-height: 1.65; }
        .hero-cta { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
        .btn-primary { background: var(--yellow); color: #000; padding: 15px 32px; border-radius: 10px; font-weight: 700; font-size: 16px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; }
        .btn-ghost { color: var(--muted); font-size: 14px; text-decoration: none; font-weight: 500; }
        .hero-trust { margin-top: 56px; display: flex; gap: 28px; flex-wrap: wrap; }
        .trust-item { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--muted); }
        .trust-icon { color: var(--green); }

        .phone-wrap { position: absolute; right: 5vw; top: 50%; transform: translateY(-50%); z-index: 1; }
        .phone { width: 240px; background: var(--card); border: 1px solid var(--border); border-radius: 32px; overflow: hidden; box-shadow: 0 40px 80px rgba(0,0,0,0.6); }
        .phone-notch { height: 28px; background: var(--surface); display: flex; align-items: center; justify-content: center; }
        .phone-notch-pill { width: 60px; height: 8px; background: var(--black); border-radius: 4px; }
        .phone-screen { padding: 14px; }
        .phone-hdr { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
        .phone-logo { width: 24px; height: 24px; border-radius: 6px; background: var(--yellow); display: flex; align-items: center; justify-content: center; font-size: 12px; }
        .phone-title { font-size: 12px; font-weight: 700; color: var(--white); }
        .phone-sub { font-size: 9px; color: var(--muted); }
        .step-bar { display: flex; gap: 4px; margin-bottom: 14px; }
        .step-dot { flex: 1; height: 3px; border-radius: 2px; }
        .phone-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 10px; margin-bottom: 8px; }
        .phone-card-title { font-size: 10px; font-weight: 700; color: var(--white); margin-bottom: 6px; }
        .phone-row { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
        .phone-check { width: 14px; height: 14px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 9px; flex-shrink: 0; }
        .check-done { background: var(--green); color: #fff; }
        .check-open { background: var(--border); }
        .phone-label { font-size: 9px; color: var(--muted); }
        .phone-label.done { color: var(--text); }
        .measure-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
        .measure-name { font-size: 9px; color: var(--muted); }
        .measure-val { font-size: 10px; font-weight: 700; color: var(--white); }
        .measure-tag { font-size: 8px; font-weight: 700; padding: 1px 5px; border-radius: 4px; }
        .ok { background: rgba(34,197,94,0.15); color: var(--green); }
        .phone-btn { background: var(--yellow); color: #000; border-radius: 7px; padding: 8px; width: 100%; font-size: 10px; font-weight: 700; text-align: center; margin-top: 8px; }

        section.steps { padding: 100px 5vw; }
        .section-label { font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--yellow); margin-bottom: 12px; }
        h2 { font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(28px, 4vw, 44px); letter-spacing: -1px; color: var(--white); margin-bottom: 16px; line-height: 1.15; }
        .section-sub { color: var(--muted); font-size: 17px; max-width: 480px; line-height: 1.65; }
        .steps-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-top: 56px; }
        .step-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 28px; transition: border-color .2s, transform .2s; }
        .step-card:hover { border-color: rgba(245,197,24,0.4); transform: translateY(-2px); }
        .step-num { width: 36px; height: 36px; border-radius: 10px; background: var(--yellow); color: #000; font-family: 'Syne', sans-serif; font-weight: 800; font-size: 16px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .step-icon { font-size: 28px; margin-bottom: 12px; }
        .step-title { font-weight: 700; font-size: 16px; color: var(--white); margin-bottom: 6px; }
        .step-desc { font-size: 14px; color: var(--muted); line-height: 1.6; }

        .voor-wie { padding: 0 5vw 100px; }
        .check-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 48px; max-width: 860px; }
        .check-card { display: flex; align-items: flex-start; gap: 14px; background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
        .check-circle { width: 28px; height: 28px; border-radius: 50%; background: rgba(34,197,94,0.15); color: var(--green); display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; margin-top: 2px; }
        .check-text { font-size: 15px; color: var(--text); line-height: 1.5; }
        .check-text strong { color: var(--white); display: block; font-weight: 600; }

        .prijzen { padding: 0 5vw 100px; }
        .price-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-top: 48px; }
        .price-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 32px; }
        .price-card.featured { border-color: var(--yellow); position: relative; background: linear-gradient(135deg, rgba(245,197,24,0.05), var(--card)); }
        .featured-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--yellow); color: #000; font-size: 11px; font-weight: 700; padding: 3px 14px; border-radius: 20px; white-space: nowrap; }
        .price-name { font-size: 13px; font-weight: 700; color: var(--muted); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; }
        .price-amount { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 40px; color: var(--white); letter-spacing: -1px; margin-bottom: 4px; }
        .price-amount span { font-size: 16px; color: var(--muted); font-weight: 400; font-family: 'DM Sans', sans-serif; }
        .price-desc { font-size: 13px; color: var(--muted); margin-bottom: 24px; }
        .price-features { list-style: none; margin-bottom: 28px; }
        .price-features li { font-size: 14px; color: var(--text); padding: 5px 0; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--border); }
        .price-features li:last-child { border-bottom: none; }
        .feat-check { color: var(--green); } .feat-dash { color: var(--border); }
        .btn-price-primary { display: block; text-align: center; text-decoration: none; background: var(--yellow); color: #000; padding: 13px; border-radius: 10px; font-weight: 700; font-size: 15px; }
        .btn-price-ghost { display: block; text-align: center; text-decoration: none; background: transparent; color: var(--muted); padding: 13px; border-radius: 10px; font-weight: 600; font-size: 15px; border: 1px solid var(--border); }

        .faq-wrap { padding: 0 5vw 100px; max-width: 720px; }
        .faq-item { border-bottom: 1px solid var(--border); }
        .faq-q { width: 100%; text-align: left; background: none; border: none; cursor: pointer; color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 16px; font-weight: 600; padding: 20px 0; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
        .faq-icon { color: var(--yellow); font-size: 20px; flex-shrink: 0; transition: transform .2s; }
        .faq-icon.open { transform: rotate(45deg); }
        .faq-a { font-size: 15px; color: var(--muted); padding-bottom: 20px; line-height: 1.7; }

        .cta-bottom { margin: 0 5vw 80px; background: linear-gradient(135deg, rgba(245,197,24,0.1), rgba(245,197,24,0.03)); border: 1px solid rgba(245,197,24,0.25); border-radius: 24px; padding: 64px 5vw; text-align: center; }
        .cta-bottom p { color: var(--muted); font-size: 17px; margin-bottom: 36px; }
        .email-input { width: 100%; padding: 14px 18px; border-radius: 10px; background: rgba(255,255,255,0.07); border: 1px solid var(--border); color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 16px; outline: none; margin-bottom: 12px; }

        footer { padding: 32px 5vw; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
        footer p { font-size: 13px; color: var(--muted); }
        .footer-links { display: flex; gap: 20px; }
        .footer-links a { font-size: 13px; color: var(--muted); text-decoration: none; }

        @media (max-width: 900px) { .phone-wrap { display: none; } }

        .wkb-explainer { padding: 0 5vw 64px; }
        .wkb-explainer-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; padding: 32px; border: 1px solid var(--border); border-radius: 18px; background: linear-gradient(135deg, rgba(245,197,24,0.04), rgba(255,255,255,0.02)); }
        .wkb-text { font-size: 15px; line-height: 1.7; color: var(--muted); }
        .wkb-text strong { color: var(--white); }
        .wkb-cta-line { text-align: center; margin-top: 20px; font-size: 14px; font-weight: 600; color: var(--yellow); }
        @media (max-width: 700px) { .wkb-explainer-inner { grid-template-columns: 1fr; } }

        @media (max-width: 600px) {
          .check-grid { grid-template-columns: 1fr; }
          .price-grid { grid-template-columns: 1fr; }
          .hero-trust { flex-direction: column; gap: 12px; }
          nav .nav-link { display: none; }
          h1 { font-size: clamp(26px, 7.8vw, 40px); }
        }
      `}</style>

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* NAV */}
      <nav>
        <a href="#" className="logo">
          <div className="logo-bolt">⚡</div>
          YourWkb
        </a>
        <div className="nav-right">
          <a href="#stappen" className="nav-link">Hoe werkt het</a>
          <a href="#prijzen" className="nav-link">Privacy &amp; kosten</a>
          <a href="/app" className="btn-nav">Gratis starten</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-grid" />
        <div className="hero-inner">
          <div className="hero-badge">
            <div className="badge-dot" />
            Nu beschikbaar: elektricien, zonnepanelen & cv-monteur
          </div>
          <h1>Opleverrapport.<br /><span>In minuten.</span><br />Op je telefoon.</h1>
          <p className="hero-sub">Leg foto's, meetwaarden en materialen vast terwijl je werkt. Automatisch een professioneel rapport naar je klant. Voor elektriciens, PV-installateurs en cv-monteurs.</p>
          <div className="hero-cta">
            <a href="/app" className="btn-primary">Gratis beginnen →</a>
            <a href="#stappen" className="btn-ghost">Bekijk hoe het werkt ↓</a>
          </div>
          <div className="hero-trust">
            <div className="trust-item"><span className="trust-icon">✓</span> Altijd gratis te gebruiken</div>
            <div className="trust-item"><span className="trust-icon">✓</span> Geen creditcard nodig</div>
            <div className="trust-item"><span className="trust-icon">✓</span> Geen advertenties</div>
            <div className="trust-item"><span className="trust-icon">✓</span> Data wordt nooit verkocht</div>
          </div>
        </div>
        {/* Telefoon mockup */}
        <div className="phone-wrap">
          <div className="phone">
            <div className="phone-notch"><div className="phone-notch-pill" /></div>
            <div className="phone-screen">
              <div className="phone-hdr">
                <div className="phone-logo">⚡</div>
                <div><div className="phone-title">WkbVeld</div><div className="phone-sub">NEN1010 · groepenkast</div></div>
              </div>
              <div className="step-bar">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="step-dot" style={{ background: i < 4 ? '#22C55E' : i === 4 ? '#F5C518' : '#2A2E3A' }} />
                ))}
              </div>
              <div className="phone-card">
                <div className="phone-card-title">Foto's — stap 5 van 8</div>
                {['Situatie vóór werkzaamheden', 'Kast gemonteerd (leeg)', 'Bedrading aangebracht', 'Aardingsrail + PE-geleiders'].map(l => (
                  <div key={l} className="phone-row">
                    <div className="phone-check check-done">✓</div>
                    <div className="phone-label done">{l}</div>
                  </div>
                ))}
                {['Verdeler dicht (afgewerkt)', 'Groepenbord / schema'].map(l => (
                  <div key={l} className="phone-row">
                    <div className="phone-check check-open" />
                    <div className="phone-label">{l}</div>
                  </div>
                ))}
              </div>
              <div className="phone-card">
                <div className="phone-card-title">Meetwaarden groep 3</div>
                {[['ISO', '2.4 MΩ'], ['ΔT', '18 ms'], ['Z L-PE', '0.38 Ω']].map(([n, v]) => (
                  <div key={n} className="measure-row">
                    <span className="measure-name">{n}</span>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span className="measure-val">{v}</span>
                      <span className="measure-tag ok">OK</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="phone-btn">📬 Rapport genereren →</div>
            </div>
          </div>
        </div>
      </section>

      {/* WAAROM DIT BELANGRIJK IS */}
      <div className="wkb-explainer">
        <div className="wkb-explainer-inner">
          <div className="wkb-col">
            <div className="section-label">⚖️ Wat is de Wkb?</div>
            <p className="wkb-text">De <strong>Wet kwaliteitsborging voor het bouwen</strong> is sinds 1 januari 2024 van kracht. De wet verplicht aannemers en installateurs om bij oplevering een dossier te overhandigen waarmee aangetoond kan worden dat het werk volgens de geldende normen is uitgevoerd.</p>
          </div>
          <div className="wkb-col">
            <div className="section-label" style={{ color: '#F87171' }}>🔒 Waarom dit jou raakt</div>
            <p className="wkb-text">Sinds de Wkb ben je als installateur aansprakelijk voor gebreken die <strong>bij oplevering niet zijn ontdekt</strong> — ook verborgen gebreken. Zonder een volledig opleverdossier kun je achteraf niet aantonen dat je werk wél aan de norm voldeed.</p>
          </div>
        </div>
        <div className="wkb-cta-line">YourWkb legt dat bewijs voor je vast — automatisch, bij elke klus.</div>
      </div>

      {/* STAPPEN */}
      <section className="steps" id="stappen">
        <div className="section-label">Hoe werkt het</div>
        <h2>Van klus naar rapport<br />in één sessie</h2>
        <p className="section-sub">Geen papieren formulieren, geen Excel, geen natypen achteraf.</p>
        <div className="steps-grid">
          {[
            { icon: '📍', n: 1, title: 'Klant en locatie', desc: 'Postcode + huisnummer — dat wordt meteen je projectnummer en bestandsnaam.' },
            { icon: '🔌', n: 2, title: 'Materiaal kiezen', desc: 'Tik de fabrikant aan, kies de serie, tik de automaten. Alles staat er al in.' },
            { icon: '📷', n: 3, title: "Foto's per checkpoint", desc: 'Vaste checkpoints: kast leeg, bedrading, aarding, verdeler dicht.' },
            { icon: '📏', n: 4, title: 'Meetwaarden invoeren', desc: 'Per groep: ISO, ΔT, ΔI, Z L-PE. Direct groen of rood op NEN1010 normen.' },
            { icon: '📄', n: 5, title: 'Rapport gegenereerd', desc: 'AI stelt het volledige NEN1010 opleverrapport op. Jij hoeft niks te typen.' },
            { icon: '📬', n: 6, title: 'Naar de klant', desc: 'PDF direct per e-mail naar de opdrachtgever. Project wordt gearchiveerd.' },
          ].map(s => (
            <div key={s.n} className="step-card">
              <div className="step-icon">{s.icon}</div>
              <div className="step-num">{s.n}</div>
              <div className="step-title">{s.title}</div>
              <div className="step-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* VOOR WIE */}
      <div className="voor-wie">
        <div className="section-label">Voor wie</div>
        <h2>Gemaakt voor de ZZP'er<br />op de bouwplaats</h2>
        <div className="check-grid">
          {[
            { title: "⚡ Elektricien ZZP'er", desc: 'Groepenkast plaatsen of vervangen — NEN1010 rapport automatisch gegenereerd.' },
            { title: '☀️ PV-installateur', desc: 'Zonnepanelen installatie — NEN1010:712 rapport met string metingen en visuele inspectie.' },
            { title: '🔥 CV-monteur', desc: 'Combiketel plaatsen of vervangen — BRL6000-25 rapport met rookgasanalyse en CO-meting.' },
            { title: 'Wkb-plicht vanaf 2024', desc: 'Aantoonbaar voldoen aan de Wet kwaliteitsborging voor het bouwen.' },
            { title: 'Werkt op je telefoon', desc: 'Open yourwkb.nl in Safari of Chrome en voeg toe aan je homescreen.' },
            { title: 'Klant krijgt professioneel rapport', desc: 'PDF direct na de klus. Met jouw naam en erkenningsnummer erop.' },
          ].map(c => (
            <div key={c.title} className="check-card">
              <div className="check-circle">✓</div>
              <div className="check-text"><strong>{c.title}</strong>{c.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* PRIJZEN */}
      <div className="prijzen" id="prijzen">
        <div className="section-label">Hoe het werkt</div>
        <h2>Altijd gratis.<br />Betaal alleen per rapport.</h2>
        <p className="section-sub" style={{ marginBottom: 32 }}>
          De app is en blijft gratis. Je betaalt alleen voor een definitief rapport. Geen abonnement, geen verborgen kosten.
        </p>

        {/* Testfase banner */}
        <div style={{ display:'inline-flex', alignItems:'center', gap:12, background:'rgba(245,197,24,0.08)', border:'1px solid rgba(245,197,24,0.3)', borderRadius:12, padding:'14px 20px', marginBottom:40 }}>
          <span style={{ fontSize:22 }}>🎁</span>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:'var(--yellow)' }}>Tijdens de testfase: alles gratis</div>
            <div style={{ fontSize:13, color:'var(--muted)' }}>Rapporten zijn nu gratis. De €2,50 per rapport gaat in zodra de testfase voorbij is. Je wordt van tevoren op de hoogte gesteld.</div>
          </div>
        </div>

        {/* Twee kaarten */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, maxWidth:700, marginBottom:24 }}>
          <div className="price-card">
            <div style={{ fontSize:32, marginBottom:12 }}>🆓</div>
            <div className="price-name">App gebruiken</div>
            <div className="price-amount">€0</div>
            <div className="price-desc">Voor altijd gratis.</div>
            <ul className="price-features">
              {[['✓','Groepenkast'],['✓','Zonnepanelen'],['✓','Combiketel'],['✓','Foto\'s & meetwaarden'],['✓','Cross-checks NEN1010']].map(([i,l])=>(
                <li key={l}><span className={i==='✓'?'feat-check':'feat-dash'}>{i}</span>{l}</li>
              ))}
            </ul>
          </div>
          <div className="price-card featured">
            <div className="featured-badge">Per rapport</div>
            <div style={{ fontSize:32, marginBottom:12 }}>📄</div>
            <div className="price-name">Definitief rapport</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom:4 }}>
              <div className="price-amount" style={{ textDecoration:'line-through', opacity:0.4 }}>€2<span style={{ fontSize:24 }}>,50</span></div>
              <div style={{ background:'var(--yellow)', color:'#000', fontWeight:800, fontSize:13, padding:'3px 10px', borderRadius:20 }}>Nu gratis</div>
            </div>
            <div className="price-desc">Eenmalig — gratis tijdens testfase.</div>
            <ul className="price-features">
              {[['✓','PDF zonder watermerk'],['✓','Conform NEN1010 / BRL'],['✓','Klaar voor oplevering'],['✓','Archivering op server'],['✓','Direct naar klant']].map(([i,l])=>(
                <li key={l}><span className="feat-check">{i}</span>{l}</li>
              ))}
            </ul>
            <a href="/app" className="btn-price-primary">Gratis beginnen →</a>
          </div>
        </div>

        {/* Binnenkort */}
        <div style={{ maxWidth:700, marginBottom:48 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', letterSpacing:1, textTransform:'uppercase', marginBottom:12 }}>Binnenkort beschikbaar</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[
              { icon:'🗄️', title:'Server archivering', desc:'Dossiers 10-20 jaar bewaard op beveiligde EU-server. Wkb-proof.' },
              { icon:'🏷️', title:'Eigen logo op rapport', desc:'Jouw huisstijl op elk rapport. Upload eenmalig je logo.' },
            ].map(c => (
              <div key={c.title} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:18, opacity:0.45, position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:10, right:10, background:'var(--border)', color:'var(--muted)', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10 }}>BINNENKORT</div>
                <div style={{ fontSize:22, marginBottom:8 }}>{c.icon}</div>
                <div style={{ fontWeight:700, fontSize:14, color:'var(--text)', marginBottom:4 }}>{c.title}</div>
                <div style={{ fontSize:12, color:'var(--muted)' }}>{c.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Belofte */}
        <div style={{ background:'#0A1A0A', border:'1px solid #22C55E33', borderRadius:16, padding:'28px 32px', maxWidth:700 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#22C55E', letterSpacing:1, textTransform:'uppercase', marginBottom:16 }}>Onze belofte</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            {[
              { title:'Geen advertenties', desc:'Nooit. Nergens. Punt.' },
              { title:'Data wordt nooit verkocht', desc:'Jouw klantdata is van jou.' },
              { title:'AVG-proof', desc:'Server staat in de EU.' },
              { title:'Geen abonnement', desc:'Betaal alleen wat je gebruikt.' },
            ].map(b => (
              <div key={b.title} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                <span style={{ color:'#22C55E', fontSize:18, marginTop:1 }}>✓</span>
                <div>
                  <div style={{ fontWeight:600, fontSize:15, color:'#fff' }}>{b.title}</div>
                  <div style={{ fontSize:13, color:'var(--muted)' }}>{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="faq-wrap">
        <div className="section-label">Vragen</div>
        <h2>Veelgestelde vragen</h2>
        <div style={{ height: 32 }} />
        {faqs.map((f, i) => (
          <div key={i} className="faq-item">
            <button className="faq-q" onClick={() => toggleFaq(i)}>
              {f.q}
              <span className={`faq-icon${openFaq === i ? ' open' : ''}`}>+</span>
            </button>
            {openFaq === i && <div className="faq-a">{f.a}</div>}
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="cta-bottom" id="aanmelden">
        <h2>Klaar om te beginnen?</h2>
        <p>Altijd gratis te gebruiken. Tijdens de testfase ook rapporten gratis.<br />
        <span style={{ fontSize:14 }}>Daarna €2,50 per rapport — je wordt van tevoren op de hoogte gesteld.</span></p>
        <div style={{ maxWidth: 400, margin: '0 auto' }}>
          <input type="email" className="email-input" placeholder="jouw@emailadres.nl" />
          <a href="/app" className="btn-primary" style={{ width: '100%', justifyContent: 'center', display: 'flex', marginBottom: 12 }}>
            Gratis beginnen →
          </a>
          <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>Daarna direct toegang tot de app. Geen wachttijd.</p>
        </div>
      </div>

      {/* FOOTER */}
      <footer>
        <p>© {new Date().getFullYear()} BlauweVisie B.V. · YourWkb is een handelsnaam · yourwkb.nl</p>
        <div className="footer-links">
          <a href="/avg">Privacy &amp; AVG</a>
          <a href="mailto:info@yourwkb.nl">info@yourwkb.nl</a>
        </div>
      </footer>
    </>
  )
}
