'use client'

export default function PrivacyPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --black: #0C0D10; --surface: #13151A; --card: #1A1D24; --border: #2A2E3A;
          --yellow: #F5C518; --green: #22C55E;
          --muted: #6B7080; --text: #E8EAF0; --white: #FFFFFF;
        }
        body { background: var(--black); color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 16px; line-height: 1.65; -webkit-font-smoothing: antialiased; }
        nav { position: sticky; top: 0; z-index: 100; padding: 0 5vw; display: flex; align-items: center; justify-content: space-between; height: 64px; background: rgba(12,13,16,0.92); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); }
        .logo { display: flex; align-items: center; gap: 10px; font-family: 'Syne', sans-serif; font-weight: 800; font-size: 20px; color: var(--white); text-decoration: none; }
        .logo-bolt { width: 32px; height: 32px; border-radius: 8px; background: var(--yellow); display: flex; align-items: center; justify-content: center; font-size: 17px; }
        .nav-link { color: var(--muted); text-decoration: none; font-size: 14px; font-weight: 500; }
        .nav-link:hover { color: var(--text); }
        main { max-width: 760px; margin: 0 auto; padding: 60px 5vw 100px; }
        .breadcrumb { color: var(--muted); font-size: 13px; margin-bottom: 28px; }
        .breadcrumb a { color: var(--muted); text-decoration: none; }
        .breadcrumb a:hover { color: var(--text); }
        h1 { font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(32px, 5vw, 44px); line-height: 1.1; letter-spacing: -1px; color: var(--white); margin-bottom: 12px; }
        .subtitle { color: var(--muted); font-size: 16px; margin-bottom: 12px; }
        .updated { display: inline-block; color: var(--muted); font-size: 13px; padding: 4px 10px; background: var(--surface); border-radius: 6px; border: 1px solid var(--border); margin-bottom: 40px; }
        .principe { background: linear-gradient(135deg, rgba(245,197,24,0.08), rgba(245,197,24,0.02)); border: 1px solid rgba(245,197,24,0.25); border-radius: 14px; padding: 24px 28px; margin-bottom: 48px; }
        .principe-titel { color: var(--yellow); font-weight: 700; font-size: 14px; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 10px; }
        .principe-tekst { color: var(--white); font-size: 17px; line-height: 1.5; font-weight: 500; }
        h2 { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 22px; color: var(--white); margin: 40px 0 16px; letter-spacing: -0.3px; }
        h3 { font-weight: 600; font-size: 16px; color: var(--white); margin: 24px 0 8px; }
        p { color: var(--text); margin-bottom: 14px; }
        ul { margin: 0 0 16px 20px; }
        li { margin-bottom: 8px; color: var(--text); }
        strong { color: var(--white); font-weight: 600; }
        a { color: var(--yellow); text-decoration: none; }
        a:hover { text-decoration: underline; }
        .contact { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 22px 26px; margin-top: 48px; }
        .contact h3 { margin-top: 0; }
        footer { border-top: 1px solid var(--border); padding: 32px 5vw; color: var(--muted); font-size: 13px; text-align: center; }
        footer a { color: var(--muted); margin: 0 8px; }
      `}</style>

      <nav>
        <a href="/" className="logo">
          <span className="logo-bolt">⚡</span>
          <span>YourWkb</span>
        </a>
        <a href="/" className="nav-link">← Terug naar home</a>
      </nav>

      <main>
        <div className="breadcrumb">
          <a href="/">YourWkb</a> · Privacyverklaring
        </div>

        <h1>Privacyverklaring</h1>
        <p className="subtitle">Hoe YourWkb omgaat met persoonsgegevens — kort en eerlijk.</p>
        <div className="updated">Laatst bijgewerkt: 30 juni 2026</div>

        <div className="principe">
          <div className="principe-titel">⚡ Ons uitgangspunt</div>
          <div className="principe-tekst">
            YourWkb slaat <strong>geen projectdata, foto's of meetwaarden</strong> op onze servers op.
            Alles blijft op het toestel van de installateur. We verdienen niets aan jouw data — alleen
            aan rapporten (€2,50 per stuk).
          </div>
        </div>

        <h2>1. Wie zijn wij?</h2>
        <p>
          YourWkb is een handelsnaam van <strong>BlauweVisie B.V.</strong>, gevestigd in Nederland en
          ingeschreven bij de Kamer van Koophandel. Voor vragen over deze verklaring, bereik ons via{' '}
          <a href="mailto:info@yourwkb.nl">info@yourwkb.nl</a>.
        </p>

        <h2>2. Welke gegevens verwerken wij?</h2>

        <h3>Op je eigen toestel (niet bij ons)</h3>
        <p>
          Alle data die je in de app invoert — klantgegevens, adres, foto's, meetwaarden, materialen —
          staat <strong>uitsluitend in je browser</strong> (localStorage en IndexedDB) op het toestel waarop je
          de app gebruikt. Wij hebben hier geen toegang toe en kunnen het niet inzien.
        </p>
        <p>
          Je bent zelf verantwoordelijk voor het bewaren van deze data. Bij verlies van het toestel of
          wissen van je browser is de data weg. Gebruik daarom regelmatig de ingebouwde back-up-functie
          om een kopie op te slaan in iCloud, Google Drive of Dropbox.
        </p>

        <h3>Wat we wél tijdelijk verwerken</h3>
        <p>Bij specifieke acties verzenden we beperkte gegevens naar externe diensten:</p>
        <ul>
          <li><strong>Bij het versturen van een rapport per e-mail</strong> — het e-mailadres van de klant en de inhoud van het rapport worden via <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Resend</a> (e-mailprovider) verstuurd. Resend logt het verzendmoment, maar bewaart geen rapportinhoud.</li>
          <li><strong>Bij gebruik van de technische beoordeling (AI-analyse)</strong> — de meetwaarden (geen klant- of NAW-gegevens) worden naar <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer">Anthropic</a> gestuurd voor analyse. De analyse wordt direct teruggegeven en niet door ons opgeslagen.</li>
          <li><strong>Bij postcode-lookup</strong> — postcode en huisnummer worden naar het Nederlandse overheids-API van <a href="https://www.pdok.nl" target="_blank" rel="noopener noreferrer">PDOK</a> gestuurd om straat en plaats op te halen.</li>
          <li><strong>Bij gebruik van de Dropbox-koppeling</strong> — als je ervoor kiest om een back-up in je eigen Dropbox op te slaan, gebeurt dit via een directe verbinding tussen jouw browser en Dropbox. YourWkb krijgt geen toegang tot je Dropbox-account of -bestanden.</li>
        </ul>

        <h3>Anonieme statistieken</h3>
        <p>
          Via <a href="https://vercel.com/docs/analytics" target="_blank" rel="noopener noreferrer">Vercel Analytics</a> meten we
          welke pagina's hoe vaak worden bezocht. Dit gebeurt <strong>zonder cookies en zonder identificatie</strong> —
          we zien geen IP-adressen, geen apparaatidentificaties en geen gebruikersprofielen.
        </p>

        <h2>3. Op welke wettelijke grond?</h2>
        <p>Voor zover er persoonsgegevens worden verwerkt, baseren we ons op:</p>
        <ul>
          <li><strong>Uitvoering van een overeenkomst</strong> — bij het versturen van een rapport naar een klant die jij hebt opgegeven (art. 6 lid 1 b AVG).</li>
          <li><strong>Gerechtvaardigd belang</strong> — voor anonieme bezoekstatistieken die ons helpen de app te verbeteren (art. 6 lid 1 f AVG).</li>
        </ul>

        <h2>4. Hoe lang bewaren wij gegevens?</h2>
        <p>
          Wij bewaren zelf geen persoonsgegevens. Wat door derde partijen kortstondig wordt verwerkt
          (Resend, Anthropic, PDOK, Vercel) valt onder hun eigen bewaartermijnen — meestal enkele dagen
          tot weken voor technische logging, daarna automatische verwijdering.
        </p>

        <h2>5. Worden gegevens gedeeld met derden?</h2>
        <p>
          Wij verkopen geen data. Wij delen geen data met derden behalve de hierboven genoemde technische
          dienstverleners die nodig zijn om de app te laten functioneren. Met elk van deze partijen heeft
          een privacybeleid dat in lijn is met de AVG.
        </p>

        <h2>6. Worden er cookies gebruikt?</h2>
        <p>
          YourWkb gebruikt <strong>geen tracking cookies en geen advertentie-cookies</strong>. We tonen daarom ook
          geen cookiebanner — er valt niets te accepteren. De app gebruikt wel browser-opslag (localStorage,
          IndexedDB) om jouw projecten op je eigen toestel te bewaren, maar dat zijn geen cookies en dat
          blijft op je toestel.
        </p>

        <h2>7. Jouw rechten onder de AVG</h2>
        <p>Je hebt het recht om:</p>
        <ul>
          <li>In te zien welke gegevens we van je hebben (in ons geval: geen)</li>
          <li>Je gegevens te corrigeren of verwijderen — verwijder simpelweg je projecten in de app, of wis je browsergegevens</li>
          <li>Bezwaar te maken tegen verwerking</li>
          <li>Een klacht in te dienen bij de <a href="https://autoriteitpersoonsgegevens.nl" target="_blank" rel="noopener noreferrer">Autoriteit Persoonsgegevens</a></li>
        </ul>

        <h2>8. Beveiliging</h2>
        <p>
          De app draait op <strong>HTTPS</strong> (versleuteld verkeer). Communicatie met externe diensten
          gebeurt eveneens versleuteld. Omdat we zelf geen data opslaan, is een eventueel datalek aan onze
          kant praktisch onmogelijk.
        </p>

        <h2>9. Wijzigingen in deze verklaring</h2>
        <p>
          We kunnen deze privacyverklaring bijwerken als de app verandert. De datum bovenaan deze pagina
          geeft de laatste wijziging weer. Bij ingrijpende wijzigingen die jou raken, communiceren we dit
          ook in de app zelf.
        </p>

        <div className="contact">
          <h3>Vragen of opmerkingen?</h3>
          <p style={{marginBottom:0}}>
            Mail naar <a href="mailto:info@yourwkb.nl">info@yourwkb.nl</a>. We reageren meestal binnen
            één werkdag.
          </p>
        </div>
      </main>

      <footer>
        © {new Date().getFullYear()} BlauweVisie B.V. · YourWkb is een handelsnaam ·{' '}
        <a href="/">Home</a> ·{' '}
        <a href="/avg">Privacy</a> ·{' '}
        <a href="mailto:info@yourwkb.nl">Contact</a>
      </footer>
    </>
  )
}
