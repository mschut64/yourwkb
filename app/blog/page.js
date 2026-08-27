'use client'
import { useState, useEffect } from 'react'

function InstallBalk() {
  const [prompt, setPrompt] = useState(null)
  const [toon, setToon] = useState(false)
  const [isIos, setIsIos] = useState(false)
  useEffect(() => {
    try { if (localStorage.getItem('ywkb_install_weg')) return } catch {}
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
    if (standalone) return
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
    if (ios) { setIsIos(true); setToon(true); return }
    const vang = (e) => { e.preventDefault(); setPrompt(e); setToon(true) }
    window.addEventListener('beforeinstallprompt', vang)
    return () => window.removeEventListener('beforeinstallprompt', vang)
  }, [])
  const installeer = async () => {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setToon(false)
  }
  const sluit = () => { setToon(false); try { localStorage.setItem('ywkb_install_weg','1') } catch {} }
  if (!toon) return null
  return (
    <div style={{ position:'fixed', left:0, right:0, bottom:0, zIndex:200, background:'#F5C518', color:'#000',
                  padding:'12px 14px calc(12px + env(safe-area-inset-bottom))', display:'flex', alignItems:'center', gap:10, fontSize:13,
                  boxShadow:'0 -4px 20px rgba(0,0,0,0.35)' }}>
      <span style={{fontSize:18}}>📲</span>
      {isIos ? (
        <span style={{flex:1}}><strong>Zet YourWkb op je beginscherm:</strong> tik op de deel-knop (vierkantje met pijl) en kies "Zet op beginscherm" — dan werkt de app ook offline.</span>
      ) : (
        <>
          <span style={{flex:1}}><strong>Installeer YourWkb als app</strong> — werkt dan ook offline, in de kelder en op de bouwplaats.</span>
          <button onClick={installeer} style={{ background:'#000', color:'#F5C518', border:'none', borderRadius:8,
                  padding:'8px 14px', fontWeight:700, fontSize:13, cursor:'pointer' }}>Installeer</button>
        </>
      )}
      <button onClick={sluit} aria-label="Sluiten" style={{ background:'transparent', border:'none', fontSize:16, cursor:'pointer', color:'#000' }}>✕</button>
    </div>
  )
}

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(null)

  const toggleFaq = (i) => setOpenFaq(openFaq === i ? null : i)

  const faqs = [
    { q: 'Wat als de paspoort-sticker verloren gaat, bijvoorbeeld door brand?', a: 'Elk opleverrapport bevat dezelfde QR-code als uitknippagina — het rapport bij de klant (en in jouw administratie) is dus automatisch de reservekopie. Scannen uit het rapport en opnieuw printen is genoeg. Er is bewust geen centrale database: de historie is zo vaak bewaard als er rapporten zijn.' },
    { q: 'Moet ik iets installeren?', a: 'Nee. YourWkb is een website die je opent in Safari of Chrome op je telefoon. Je kunt hem toevoegen aan je homescreen — dan ziet het eruit als een app. Geen app store, geen updates.' },
    { q: 'Is het rapport echt NEN 1010-compliant?', a: 'Het rapport is gebaseerd op NEN 1010 deel 6 en bevat alle verplichte onderdelen: NAW-gegevens, meetapparatuur, eindgroepen-meetstaat met ISO, ΔT en ΔI, impedantie, aardingswaarden en een conformverklaring. Jij bent verantwoordelijk voor de juistheid van de ingevoerde meetwaarden.' },
    { q: 'Hoe lang worden mijn dossiers bewaard?', a: 'Al je projectdata en PDF\u2019s staan op je eigen toestel; wij hebben geen database met jouw dossiers. Alleen als je een rapport mailt of de AI-analyse gebruikt, verwerken onze e-mail- en AI-leverancier die gegevens kortstondig (zie de privacyverklaring). Maak een back-up via het Back-up & delen-scherm en bewaar je dossiers zelf, bijvoorbeeld conform de Wkb-aansprakelijkheidstermijn.' },
    { q: 'Worden er advertenties getoond of wordt mijn data verkocht?', a: 'Nee. YourWkb toont geen advertenties en verkoopt nooit data aan derden. Jouw klantgegevens, meetwaarden en projectdata zijn en blijven van jou. We verdienen aan definitieve rapporten en bundels.' },
    { q: 'Werkt het ook voor andere disciplines?', a: 'Ja — groepenkast, zonnepanelen, combiketel, warmtepomp, laadpaal en thuisbatterij zijn allemaal beschikbaar, elk met eigen checkpunten, metingen en rapport. Specifieke wensen? Mail naar info@yourwkb.nl.' },
    { q: 'Wat kost het na de testperiode?', a: 'De app is gratis te gebruiken. Rapporten zijn nu gratis tijdens de testfase. Daarna betaal je €7,50 per definitief rapport, of je kiest de voordeelbundel: 10 rapporten voor €55 (€5,50 per stuk). Je wordt van tevoren op de hoogte gesteld — geen verrassingen.' },
  ]

  return (
    <>
      <InstallBalk/>
      <style>{`
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --black: #111318; --surface: #1A1D25; --card: #20242F; --border: #2E3347;
  --border-strong: #3E4459;
  --yellow: #F5C518; --yellow2: #E8A800; --green: #27AE60;
  --orange: #F59E0B; --red: #FF5A52;
  --muted: #9BA3B8; --text-soft: #C2C8D8; --text: #ECEEF5; --white: #FFFFFF;
}
html { scroll-behavior: smooth; }
body { background: var(--black); color: var(--text); font-family: 'IBM Plex Sans', sans-serif; font-size: 17px; line-height: 1.6; overflow-x: hidden; text-wrap: pretty; }
a { color: var(--yellow); text-decoration: none; }
a:hover { color: #FFD84D; }
:focus-visible { outline: 3px solid var(--yellow); outline-offset: 3px; }

nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 0 5vw; display: flex; align-items: center; justify-content: space-between; height: 64px; background: rgba(17,19,24,0.92); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); }
.logo { display: flex; align-items: center; gap: 10px; font-family: 'Syne', sans-serif; font-weight: 800; font-size: 20px; color: var(--white); text-decoration: none; }
.logo-bolt { width: 32px; height: 32px; border-radius: 8px; background: var(--yellow); display: flex; align-items: center; justify-content: center; font-size: 17px; }
.nav-right { display: flex; align-items: center; gap: 16px; }
.nav-link { color: var(--text-soft); text-decoration: none; font-size: 15px; font-weight: 500; }
.nav-link:hover { color: var(--white); }
.btn-nav { background: var(--yellow); color: #000; min-height: 40px; padding: 0 20px; border-radius: 8px; font-weight: 600; font-size: 15px; text-decoration: none; display: inline-flex; align-items: center; }

.hero { display: flex; flex-direction: column; justify-content: center; padding: 120px 5vw 72px; position: relative; overflow: hidden; }
.hero-bg { position: absolute; inset: 0; background: radial-gradient(ellipse 80% 60% at 60% 40%, rgba(245,197,24,0.07) 0%, transparent 70%); pointer-events: none; }
.hero-grid { position: absolute; inset: 0; opacity: 0.03; background-image: linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px); background-size: 48px 48px; pointer-events: none; }
.hero-inner { max-width: 700px; position: relative; z-index: 1; }
.hero-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(245,197,24,0.12); border: 1px solid rgba(245,197,24,0.40); color: var(--yellow); font-size: 13px; font-weight: 600; min-height: 34px; padding: 0 14px; border-radius: 20px; margin-bottom: 28px; }
.badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--yellow); animation: pulse 2s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

h1, .payoff { font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(28px, 5.4vw, 48px); line-height: 1.08; letter-spacing: -0.02em; color: var(--white); margin-bottom: 24px; text-wrap: balance; word-break: keep-all; overflow-wrap: normal; hyphens: none; }
h1 span, .payoff span { color: var(--yellow); }
.hero-sub { font-size: clamp(17px, 2vw, 20px); color: var(--text-soft); max-width: 52ch; margin-bottom: 40px; line-height: 1.6; }
.hero-cta { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }

.btn-primary { background: var(--yellow); color: #000; min-height: 56px; padding: 0 32px; border-radius: 10px; font-weight: 700; font-size: 17px; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 1px solid transparent; }
.btn-primary:hover { background: #FFD84D; color: #000; }
.btn-primary:active { background: var(--yellow2); }
.btn-ghost { color: var(--text); background: transparent; border: 1px solid var(--border-strong); min-height: 56px; padding: 0 28px; border-radius: 10px; font-size: 17px; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
.btn-ghost:hover { background: var(--card); color: var(--text); border-color: #4A5164; }

.hero-trust { margin-top: 56px; display: flex; gap: 28px; flex-wrap: wrap; }
.trust-item { display: flex; align-items: center; gap: 8px; font-size: 15px; color: var(--text-soft); }
.trust-icon { color: var(--green); }

.phone-wrap { position: absolute; right: 5vw; top: 50%; transform: translateY(-50%); z-index: 1; }
.phone { width: 240px; background: var(--card); border: 1px solid var(--border); border-radius: 32px; overflow: hidden; box-shadow: 0 40px 80px rgba(0,0,0,0.6); animation: phoneFloat 6s ease-in-out infinite; }
@keyframes phoneFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
@media (prefers-reduced-motion: reduce) { .phone { animation: none !important; } .badge-dot { animation: none !important; } }
.phone-shot { display: block; width: 100%; border-radius: 10px; border: 1px solid var(--border); }
.phone-notch { height: 28px; background: var(--surface); display: flex; align-items: center; justify-content: center; }
.phone-notch-pill { width: 60px; height: 8px; background: var(--black); border-radius: 4px; }
.phone-screen { padding: 14px; }
.phone-hdr { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
.phone-logo { width: 24px; height: 24px; border-radius: 6px; background: var(--yellow); display: flex; align-items: center; justify-content: center; font-size: 12px; }
.phone-title { font-size: 12px; font-weight: 700; color: var(--white); }
.phone-sub { font-size: 10px; color: var(--muted); }
.step-bar { display: flex; gap: 4px; margin-bottom: 14px; }
.step-dot { flex: 1; height: 3px; border-radius: 2px; }
.phone-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 10px; margin-bottom: 8px; }
.phone-card-title { font-size: 11px; font-weight: 700; color: var(--white); margin-bottom: 6px; }
.phone-row { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
.phone-check { width: 15px; height: 15px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0; }
.check-done { background: var(--green); color: #fff; }
.check-open { background: transparent; border: 1px solid var(--border-strong); color: var(--muted); }
.check-open::before { content: '·'; }
.phone-label { font-size: 10px; color: var(--muted); }
.phone-label.done { color: var(--text); }
.measure-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.measure-name { font-size: 10px; color: var(--muted); }
.measure-val { font-size: 12px; font-weight: 700; color: var(--white); font-variant-numeric: tabular-nums; }
.measure-tag { font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 4px; }
.ok { background: rgba(39,174,96,0.18); color: var(--green); border: 1px solid rgba(39,174,96,0.45); }
.phone-btn { background: var(--yellow); color: #000; border-radius: 7px; padding: 9px; width: 100%; font-size: 11px; font-weight: 700; text-align: center; margin-top: 8px; }

section.steps { padding: 96px 5vw; }
.section-label { font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--yellow); margin-bottom: 12px; }
h2 { font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(26px, 3.6vw, 40px); letter-spacing: -0.02em; color: var(--white); margin-bottom: 16px; line-height: 1.14; text-wrap: balance; }
.section-sub { color: var(--text-soft); font-size: 18px; max-width: 56ch; line-height: 1.6; }
.steps-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-top: 56px; }
.step-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 28px; transition: border-color .2s, transform .2s; }
.step-card:hover { border-color: rgba(245,197,24,0.4); transform: translateY(-2px); }
.step-num { width: 36px; height: 36px; border-radius: 10px; background: var(--yellow); color: #000; font-family: 'Syne', sans-serif; font-weight: 800; font-size: 16px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
.step-icon { font-size: 28px; margin-bottom: 12px; }
.step-title { font-weight: 700; font-size: 17px; color: var(--white); margin-bottom: 6px; }
.step-desc { font-size: 15px; color: var(--muted); line-height: 1.6; }

.voor-wie { padding: 0 5vw 96px; }
.check-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 48px; max-width: 860px; }
.check-card { display: flex; align-items: flex-start; gap: 14px; background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
.check-circle { width: 28px; height: 28px; border-radius: 50%; background: rgba(39,174,96,0.18); border: 1px solid rgba(39,174,96,0.45); color: var(--green); display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; margin-top: 2px; }
.check-text { font-size: 16px; color: var(--text-soft); line-height: 1.5; }
.check-text strong { color: var(--white); display: block; font-weight: 600; }

.prijzen { padding: 0 5vw 96px; }
.price-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-top: 48px; }
.price-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 32px; display: flex; flex-direction: column; }
.price-card.featured { border-color: var(--yellow); position: relative; background: linear-gradient(135deg, rgba(245,197,24,0.06), var(--card)); }
.featured-badge { position: absolute; top: -13px; left: 50%; transform: translateX(-50%); background: var(--yellow); color: #000; font-size: 12px; font-weight: 700; min-height: 26px; padding: 0 14px; border-radius: 20px; white-space: nowrap; display: inline-flex; align-items: center; }
.price-name { font-size: 13px; font-weight: 700; color: var(--muted); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; }
.price-amount { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 40px; color: var(--white); letter-spacing: -0.02em; margin-bottom: 4px; }
.price-amount span { font-size: 16px; color: var(--muted); font-weight: 400; font-family: 'IBM Plex Sans', sans-serif; }
.price-desc { font-size: 15px; color: var(--text-soft); margin-bottom: 24px; }
.price-features { list-style: none; margin-bottom: 28px; }
.price-features li { font-size: 15px; color: var(--text-soft); padding: 7px 0; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--border); }
.price-features li:last-child { border-bottom: none; }
.feat-check { color: var(--green); }
.feat-dash { color: var(--muted); }
.btn-price-primary { display: flex; align-items: center; justify-content: center; text-decoration: none; background: var(--yellow); color: #000; min-height: 52px; border-radius: 10px; font-weight: 700; font-size: 16px; margin-top: auto; }
.btn-price-ghost { display: flex; align-items: center; justify-content: center; text-decoration: none; background: transparent; color: var(--text); min-height: 52px; border-radius: 10px; font-weight: 600; font-size: 16px; border: 1px solid var(--border-strong); margin-top: auto; }

.faq-wrap { padding: 0 5vw 96px; max-width: 720px; }
.faq-item { border-bottom: 1px solid var(--border); }
.faq-q { width: 100%; min-height: 60px; text-align: left; background: none; border: none; cursor: pointer; color: var(--text); font-family: 'IBM Plex Sans', sans-serif; font-size: 17px; font-weight: 600; padding: 16px 0; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.faq-icon { color: var(--yellow); font-size: 22px; flex-shrink: 0; transition: transform .2s; }
.faq-icon.open { transform: rotate(45deg); }
.faq-a { font-size: 16px; color: var(--text-soft); padding-bottom: 20px; line-height: 1.7; }

.cta-bottom { margin: 0 5vw 80px; background: linear-gradient(135deg, rgba(245,197,24,0.10), rgba(245,197,24,0.03)); border: 1px solid rgba(245,197,24,0.25); border-radius: 24px; padding: 64px 5vw; text-align: center; }
.cta-bottom p { color: var(--text-soft); font-size: 18px; margin-bottom: 36px; }
.email-input { width: 100%; min-height: 56px; padding: 0 18px; border-radius: 10px; background: var(--surface); border: 1px solid var(--border-strong); color: var(--text); font-family: 'IBM Plex Sans', sans-serif; font-size: 17px; outline: none; margin-bottom: 12px; }
.email-input::placeholder { color: var(--muted); }

footer { padding: 32px 5vw; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
footer p { font-size: 14px; color: var(--muted); }
.footer-links { display: flex; gap: 20px; }
.footer-links a { font-size: 14px; color: var(--text-soft); text-decoration: none; }
.footer-links a:hover { color: var(--white); }

.wkb-explainer { padding: 0 5vw 64px; }
.wkb-explainer-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; padding: 32px; border: 1px solid var(--border); border-radius: 18px; background: linear-gradient(135deg, rgba(245,197,24,0.04), rgba(255,255,255,0.02)); }
.wkb-text { font-size: 16px; line-height: 1.7; color: var(--text-soft); }
.wkb-text strong { color: var(--white); }
.wkb-cta-line { text-align: center; margin-top: 20px; font-size: 15px; font-weight: 600; color: var(--yellow); }

/* status: kleur én teken — nieuw, voor sectie-inhoud die nu alleen kleur gebruikt */
.status-ok, .status-warn, .status-fail { display: inline-flex; align-items: center; gap: 6px; min-height: 34px; padding: 0 12px; border-radius: 20px; font-size: 14px; font-weight: 700; line-height: 1; }
.status-ok   { color: var(--green);  background: rgba(39,174,96,0.16);  border: 1px solid rgba(39,174,96,0.45); }
.status-warn { color: var(--orange); background: rgba(245,158,11,0.16); border: 1px solid rgba(245,158,11,0.45); }
.status-fail { color: var(--red);    background: rgba(255,90,82,0.16);  border: 1px solid rgba(255,90,82,0.50); }
.status-ok::before   { content: '\\2713'; }
.status-warn::before { content: '\\26A0'; }
.status-fail::before { content: '\\2717'; }

@media (max-width: 900px) {
  .phone-wrap { position: static; transform: none; display: flex; justify-content: center; margin: 48px auto 0; }
  .phone { width: 220px; }
  .hero { padding-bottom: 72px; }
  .wkb-explainer-inner { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .check-grid { grid-template-columns: 1fr; }
  .price-grid { grid-template-columns: 1fr; }
  .hero-trust { flex-direction: column; gap: 12px; }
  nav .nav-link { display: none; }
  .btn-primary, .btn-ghost { width: 100%; }
}
      `}</style>

      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* NAV */}
      <nav>
        <a href="#" className="logo">
          <div className="logo-bolt"><svg width="18" height="18" viewBox="0 0 24 24" fill="#000000" aria-hidden="true"><path d="M13 2 L3 14 h7 l-1 8 L19 10 h-7 l1-8 z" /></svg></div>
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
            Nu voor 6 disciplines: groepenkast · PV · cv · WP · laadpaal · thuisbatterij
          </div>
          <h1 style={{ fontFamily: 'inherit', fontWeight: 600, fontSize: 15, letterSpacing: 0.3, color: 'var(--muted)', margin: '0 0 14px', lineHeight: 1.4 }}>
            Wkb-opleverrapport &amp; NEN 1010-rapport maken — de app voor installateurs
          </h1>
          <p className="payoff">De standaard<br /><span>voor je</span><br />opleverrapport.</p>
          <p className="hero-sub">De Wet kwaliteitsborging voor het bouwen legt de aansprakelijkheid voor je werk bij jou. YourWkb legt het bewijs vast: NEN-conform opleverrapport, in minuten, vanaf je telefoon.</p>
          <div className="hero-cta">
            <a href="/app" className="btn-primary">Gratis beginnen →</a>

          </div>
          <div className="hero-trust">
            <div className="trust-item"><span className="trust-icon">✓</span> Gratis te gebruiken</div>
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
                <div className="phone-logo"><svg width="13" height="13" viewBox="0 0 24 24" fill="#000000" aria-hidden="true"><path d="M13 2 L3 14 h7 l-1 8 L19 10 h-7 l1-8 z" /></svg></div>
                <div><div className="phone-title">YourWkb</div><div className="phone-sub">NEN 1010 · groepenkast</div></div>
              </div>
              <img className="phone-shot" src="/yourwkbpromo.gif" alt="YourWkb app — van meting naar rapport" />
              <div className="phone-btn">📬 Rapport genereren →</div>
            </div>
          </div>
        </div>
      </section>

      <section id="voorbeeldrapport" style={{ padding: '72px 24px', maxWidth: 1060, margin: '0 auto', textAlign: 'center' }}>
        <div className="section-label">📄 Het bewijs</div>
        <h2 className="section-title">Zo ziet jouw oplevering eruit</h2>
        <p className="section-sub" style={{ maxWidth: 620, margin: '0 auto 32px' }}>
          Geen belofte maar een document: metingen getoetst aan de norm, groepenoverzicht, foto's,
          conformiteitsverklaring — en de paspoort-sticker als uitknippagina.
        </p>
        <div style={{ maxWidth: 560, margin: '0 auto', background: '#fff', borderRadius: 12, padding: '22px 26px',
                      textAlign: 'left', boxShadow: '0 12px 40px rgba(0,0,0,0.5)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '38%', left: '50%', transform: 'translate(-50%,-50%) rotate(-24deg)',
                        fontSize: 54, fontWeight: 900, color: 'rgba(200,60,60,0.10)', letterSpacing: 4, pointerEvents: 'none' }}>VOORBEELD</div>
          <p style={{ color: '#F5C518', fontWeight: 800, fontSize: 20, fontFamily: 'Arial, sans-serif' }}>Opleveringsrapport</p>
          <p style={{ color: '#555', fontSize: 12, marginBottom: 14, fontFamily: 'Arial, sans-serif' }}>Groepenkastvervanging · NEN 1010 · 06-08-2026</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Arial, sans-serif' }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #ddd', padding: '5px 8px', fontSize: 12, color: '#222' }}>Isolatieweerstand (per groep)</td>
                <td style={{ border: '1px solid #ddd', padding: '5px 8px', fontSize: 12, color: '#222' }}>≥ 12 MΩ <span style={{ color: '#888' }}>(norm ≥ 0,23)</span></td>
                <td style={{ border: '1px solid #ddd', padding: '5px 8px', fontSize: 12, fontWeight: 700, color: '#166534', background: '#dcfce7' }}>voldoet</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #ddd', padding: '5px 8px', fontSize: 12, color: '#222', background: '#f9f9f9' }}>Aardlektest 30 mA</td>
                <td style={{ border: '1px solid #ddd', padding: '5px 8px', fontSize: 12, color: '#222', background: '#f9f9f9' }}>22–26 ms <span style={{ color: '#888' }}>(≤ 300)</span></td>
                <td style={{ border: '1px solid #ddd', padding: '5px 8px', fontSize: 12, fontWeight: 700, color: '#166534', background: '#dcfce7' }}>voldoet</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #ddd', padding: '5px 8px', fontSize: 12, color: '#222' }}>Veldmeting verste groep (Z L-PE)</td>
                <td style={{ border: '1px solid #ddd', padding: '5px 8px', fontSize: 12, color: '#222' }}>0,89 Ω</td>
                <td style={{ border: '1px solid #ddd', padding: '5px 8px', fontSize: 12, fontWeight: 700, color: '#166534', background: '#dcfce7' }}>voldoet ✓</td>
              </tr>
            </tbody>
          </table>
          <p style={{ color: '#999', fontSize: 11, marginTop: 10, fontFamily: 'Arial, sans-serif' }}>… + groepenoverzicht, foto's, conformiteitsverklaring en paspoort-sticker</p>
        </div>
        <a href="/voorbeeld-opleverrapport.html" target="_blank" rel="noopener" className="btn-primary"
           style={{ display: 'inline-block', marginTop: 28 }}
           onClick={() => { try { window.posthog?.capture('voorbeeldrapport_bekeken') } catch {} }}>
          Open het volledige voorbeeldrapport →
        </a>
      </section>

      <section id="meterkastpaspoort" style={{ padding: '72px 24px', maxWidth: 1060, margin: '0 auto', textAlign: 'center' }}>
        <div className="section-label">⚡ Het meterkastpaspoort</div>
        <h2 className="section-title">De kastdeur onthoudt wat jij hebt gedaan</h2>
        <p className="section-sub" style={{ maxWidth: 640, margin: '0 auto 36px' }}>
          Elk YourWkb-rapport levert een QR-sticker voor op de meterkastdeur: wie heeft wat gedaan, wat hangt er,
          hoe is de load balancing ingesteld. Elke volgende monteur scant en weet het — en schrijft zíjn werk bij.
          Alle gegevens zitten in de QR zelf: geen account, geen database, werkt in een kelder zonder bereik.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 36, alignItems: 'center', justifyContent: 'center' }}>
          <img src="/mkp-demo-sticker.png" alt="Demo meterkastpaspoort — scan met je telefooncamera"
               style={{ width: 280, maxWidth: '86vw', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.45)' }} />
          <div style={{ maxWidth: 380, textAlign: 'left' }}>
            <p style={{ color: '#F5C518', fontWeight: 700, fontSize: 15, marginBottom: 10 }}>📱 Probeer het nu — scan de demo</p>
            <p style={{ color: '#9aa0a6', fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>
              Dit is een écht werkend paspoort: richt je telefooncamera op de QR en bekijk de kast —
              3×25 A uit ±1995, zonnepanelen, laadpaal met dynamische load balancing, en een logboek
              met drie monteurs over zeven jaar.
            </p>
            <p style={{ color: '#9aa0a6', fontSize: 13, lineHeight: 1.6 }}>
              Het paspoort is een <a href="https://meterkastpaspoort.nl" target="_blank" rel="noopener" style={{ color: '#F5C518' }}>open standaard</a> —
              van de sector, niet van ons. De sticker zit standaard als uitknippagina in elk opleverrapport.
            </p>
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
            { icon: '📏', n: 4, title: 'Meetwaarden invoeren', desc: 'Per groep: ISO, ΔT, ΔI, Z L-PE. Direct groen of rood op NEN 1010 normen.' },
            { icon: '📄', n: 5, title: 'Rapport gegenereerd', desc: 'AI stelt het volledige NEN 1010 opleverrapport op. Jij hoeft niks te typen.' },
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
            { title: "⚡ Elektricien ZZP'er", desc: 'Groepenkast plaatsen of vervangen — NEN 1010 rapport automatisch gegenereerd.' },
            { title: '☀️ PV-installateur', desc: 'Zonnepanelen installatie — NEN 1010:712 rapport met string metingen en visuele inspectie.' },
            { title: '🔥 CV-monteur', desc: 'Combiketel plaatsen of vervangen — BRL6000-25 rapport met rookgasanalyse en CO-meting.' },
            { title: '🌡️ Warmtepomp-monteur', desc: 'Warmtepomp installatie — opleverrapport met elektrische en hydraulische controles.' },
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
        <h2>De app is gratis.<br />Je betaalt per opleverrapport.</h2>
        <p className="section-sub" style={{ marginBottom: 32 }}>
          Alles in de app is gratis: invullen, meten, normchecks en een concept-rapport met watermerk. Alleen het definitieve rapport voor je klant — zonder watermerk — betaal je. Los, of via de voordeelbundel. Geen vaste lasten, geen verborgen kosten.
        </p>

        {/* Testfase banner */}
        <div style={{ display:'inline-flex', alignItems:'center', gap:12, background:'rgba(245,197,24,0.08)', border:'1px solid rgba(245,197,24,0.3)', borderRadius:12, padding:'14px 20px', marginBottom:40 }}>
          <span style={{ fontSize:22 }}>🎁</span>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:'var(--yellow)' }}>Tijdens de testfase: alles gratis</div>
            <div style={{ fontSize:13, color:'var(--muted)' }}>Rapporten zijn nu gratis. Na de testfase: €7,50 per rapport, of 10 voor €55 met de bundel. Je wordt van tevoren op de hoogte gesteld.</div>
          </div>
        </div>

        {/* Twee kaarten */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, maxWidth:700, marginBottom:24 }}>
          <div className="price-card">
            <div style={{ fontSize:32, marginBottom:12 }}>🆓</div>
            <div className="price-name">App gebruiken</div>
            <div className="price-amount">€0</div>
            <div className="price-desc">Gratis.</div>
            <ul className="price-features">
              {[['✓','Groepenkast · Zonnepanelen · Combiketel'],['✓','Warmtepomp · Laadpaal · Thuisbatterij'],['✓','Foto\'s, meetwaarden & normchecks'],['✓','QR-meterkastpaspoort op de kastdeur'],['✓','Werkt offline — ook in de kelder'],['✓','Concept-rapport met watermerk'],['✓','Back-up & delen met een collega']].map(([i,l])=>(
                <li key={l}><span className={i==='✓'?'feat-check':'feat-dash'}>{i}</span>{l}</li>
              ))}
            </ul>
          </div>
          <div className="price-card featured">
            <div className="featured-badge">Per rapport</div>
            <div style={{ fontSize:32, marginBottom:12 }}>📄</div>
            <div className="price-name">Definitief opleverrapport</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom:4 }}>
              <div className="price-amount" style={{ textDecoration:'line-through', opacity:0.4 }}>€7<span style={{ fontSize:24 }}>,50</span></div>
              <div style={{ background:'var(--yellow)', color:'#000', fontWeight:800, fontSize:13, padding:'3px 10px', borderRadius:20 }}>Nu gratis</div>
            </div>
            <div className="price-desc">Los €7,50 · bundel 10 voor €55 (€5,50/st). Gratis tijdens testfase.</div>
            <ul className="price-features">
              {[['✓','PDF zonder watermerk'],['✓','Conform NEN 1010 / BRL'],['✓','Klaar voor oplevering'],['✓','Jouw naam & erkenningsnummer'],['✓','Eigen logo op het rapport'],['✓','Direct naar klant']].map(([i,l])=>(
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
              { icon:'🧮', title:'Meterkast-belastingcheck', desc:'Kan de kast het totaal aan? Hoofdaansluiting én railcapaciteit getoetst.' },
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
              { title:'Geen vaste lasten', desc:'Betaal per rapport, of kies vrijblijvend een bundel.' },
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
        <p>De app is gratis te gebruiken. Tijdens de testfase zijn ook rapporten gratis.<br />
        <span style={{ fontSize:14 }}>Daarna €7,50 per rapport of 10 voor €55 — je wordt van tevoren op de hoogte gesteld.</span></p>
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
          <a href="https://www.linkedin.com/company/yourwkb" target="_blank" rel="noopener" aria-label="YourWkb op LinkedIn">in&#8288; LinkedIn</a>
          <a href="/blog">Blog</a>
          <a href="/avg">Privacy &amp; AVG</a>
          <a href="mailto:info@yourwkb.nl">info@yourwkb.nl</a>
        </div>
      </footer>
    </>
  )
}
