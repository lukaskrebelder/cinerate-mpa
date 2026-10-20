// KI-Log B22: Erstellt mithilfe von KI (Claude Sonnett 5.5)
// Tests für die Seite /filme der MPA (US-5, PB-23) und die Hinweise auf der Anmeldeseite.
// Die App läuft auf einem freien Port, das BFF wird durch ein gefälschtes ersetzt,
// das jeden Aufruf merkt. So sieht man, was die MPA ans BFF geschickt hat.
const test = require("node:test");
const assert = require("node:assert");
const { createApp } = require("../app");
const { BffFehler } = require("../lib/bff");

// Gefälschtes BFF. suche(eingaben, token) liefert die Treffer oder wirft einen Fehler.
function erstelleBff(suche) {
  const aufrufe = [];
  return {
    aufrufe,
    holeStatus: async () => ({ status: "ok" }),
    anfrage: async () => ({}),
    sucheFilme: async (eingaben, token) => {
      aufrufe.push({ eingaben, token });
      return suche(eingaben, token);
    },
  };
}

async function mitServer(bff, pruefung) {
  const server = createApp({ bff }).listen(0);
  await new Promise((fertig) => server.once("listening", fertig));
  try {
    await pruefung(`http://localhost:${server.address().port}`);
  } finally {
    await new Promise((fertig) => server.close(fertig));
  }
}

const ANGEMELDET = { Cookie: "cinerate_token=tok_abc" };

const filme = [
  { movieId: 1, title: "Interstellar", posterUrl: "https://image.tmdb.org/t/p/w500/a.jpg" },
  { movieId: 2, title: "Ohne Poster", posterUrl: null },
  { movieId: 3, title: "Fremdes Bild", posterUrl: "https://evil.example.com/x.jpg" },
];
const seite = (page, totalPages, movies = filme) => ({ page, totalPages, movies });

// ---------- Zugriff ----------

test("/filme leitet Gäste mit einem Hinweis zur Anmeldung", async () => {
  const bff = erstelleBff(() => seite(1, 1));
  await mitServer(bff, async (basis) => {
    const antwort = await fetch(`${basis}/filme`, { redirect: "manual" });
    assert.strictEqual(antwort.status, 303);
    assert.strictEqual(antwort.headers.get("location"), "/anmelden?hinweis=anmeldung");
    assert.strictEqual(bff.aufrufe.length, 0);
  });
});

test("Die Anmeldeseite zeigt den Hinweis zum Stichwort und ignoriert unbekannte Stichworte", async () => {
  await mitServer(erstelleBff(() => seite(1, 1)), async (basis) => {
    const mit = await (await fetch(`${basis}/anmelden?hinweis=abgelaufen`)).text();
    assert.ok(mit.includes('<div class="hinweis" role="status">Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.</div>'));
    const ohne = await (await fetch(`${basis}/anmelden?hinweis=<script>alert(1)</script>`)).text();
    assert.ok(!ohne.includes('class="hinweis"'));
    assert.ok(!ohne.includes("<script>alert(1)</script>"));
  });
});

test("Im Menü steht für Angemeldete der Punkt Filme, für Gäste nicht", async () => {
  await mitServer(erstelleBff(() => seite(1, 1)), async (basis) => {
    const angemeldet = await (await fetch(`${basis}/`, { headers: ANGEMELDET })).text();
    assert.ok(angemeldet.includes('<a href="/filme">Filme</a>'));
    const gast = await (await fetch(`${basis}/`)).text();
    assert.ok(!gast.includes(">Filme</a>"));
  });
});

test("Auf der Seite Filme ist der Menüpunkt Filme als aktiv markiert", async () => {
  await mitServer(erstelleBff(() => seite(1, 1)), async (basis) => {
    const html = await (await fetch(`${basis}/filme`, { headers: ANGEMELDET })).text();
    assert.match(html, /<a href="\/filme" class="aktiv">Filme<\/a>/);
  });
});

// ---------- Trefferliste ----------

test("/filme zeigt die Treffer als Karten mit Poster, Platzhalter und Titel", async () => {
  const bff = erstelleBff(() => seite(1, 3));
  await mitServer(bff, async (basis) => {
    const antwort = await fetch(`${basis}/filme`, { headers: ANGEMELDET });
    const html = await antwort.text();
    assert.strictEqual(antwort.status, 200);
    assert.ok(html.includes('<img src="https://image.tmdb.org/t/p/w500/a.jpg" alt="Poster zu Interstellar" loading="lazy" />'));
    assert.ok(html.includes("Interstellar"));
    assert.ok(html.includes("Ohne Poster"));
    assert.strictEqual((html.match(/Kein Poster/g) ?? []).length, 2);   // ohne Bild und mit fremder Adresse
    assert.ok(!html.includes("evil.example.com"));
  });
});

test("/filme ruft das BFF mit Token und den Eingaben aus der Adresse auf", async () => {
  const bff = erstelleBff(() => seite(2, 5));
  await mitServer(bff, async (basis) => {
    await fetch(`${basis}/filme?query=%20Matrix%20&genre=Science+Fiction&page=2`, { headers: ANGEMELDET });
    assert.strictEqual(bff.aufrufe.length, 1);
    assert.strictEqual(bff.aufrufe[0].token, "tok_abc");
    assert.deepStrictEqual(bff.aufrufe[0].eingaben, { query: "Matrix", genre: "Science Fiction", page: 2 });
  });
});

test("/filme ohne Eingaben fragt die Standardliste auf Seite 1 ab", async () => {
  const bff = erstelleBff(() => seite(1, 1));
  await mitServer(bff, async (basis) => {
    await fetch(`${basis}/filme?page=abc`, { headers: ANGEMELDET });
    assert.deepStrictEqual(bff.aufrufe[0].eingaben, { query: "", genre: "", page: 1 });
  });
});

test("Die Eingaben stehen nach dem Suchen wieder im Formular, das Genre ist ausgewählt", async () => {
  await mitServer(erstelleBff(() => seite(1, 1)), async (basis) => {
    const html = await (await fetch(`${basis}/filme?query=Matrix&genre=Komödie`, { headers: ANGEMELDET })).text();
    assert.ok(html.includes('value="Matrix"'));
    assert.ok(html.includes('<option value="Komödie" selected>Komödie</option>'));
  });
});

test("Titel und Eingaben werden maskiert (kein Schadcode auf der Seite)", async () => {
  const gefaehrlich = [{ movieId: 9, title: "<script>alert(1)</script>", posterUrl: null }];
  await mitServer(erstelleBff(() => seite(1, 1, gefaehrlich)), async (basis) => {
    const html = await (await fetch(`${basis}/filme?query=%22%3E%3Cscript%3Ealert(2)%3C/script%3E`, { headers: ANGEMELDET })).text();
    assert.ok(!html.includes("<script>alert(1)</script>"));
    assert.ok(!html.includes("<script>alert(2)</script>"));
    assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  });
});

test("Keine Treffer zeigen die Meldung und keine Seitennavigation", async () => {
  await mitServer(erstelleBff(() => seite(1, 0, [])), async (basis) => {
    const html = await (await fetch(`${basis}/filme?query=qqqq`, { headers: ANGEMELDET })).text();
    assert.ok(html.includes("Keine Filme gefunden."));
    assert.ok(!html.includes("seiten-navigation"));
  });
});

// ---------- Blättern ----------

test("Auf der ersten Seite ist Zurück gesperrt und Weiter ein Link, der die Suche behält", async () => {
  await mitServer(erstelleBff(() => seite(1, 3)), async (basis) => {
    const html = await (await fetch(`${basis}/filme?query=Tom+%26+Jerry&genre=Action`, { headers: ANGEMELDET })).text();
    assert.ok(html.includes('<span class="button deaktiviert" aria-disabled="true">Zurück</span>'));
    assert.ok(html.includes('<a class="button" href="/filme?query=Tom+%26+Jerry&amp;genre=Action&amp;page=2">Weiter</a>'));
    assert.ok(html.includes("Seite 1 von 3"));
  });
});

test("In der Mitte gibt es Zurück und Weiter, auf der letzten Seite ist Weiter gesperrt", async () => {
  await mitServer(erstelleBff((e) => seite(e.page, 3)), async (basis) => {
    const mitte = await (await fetch(`${basis}/filme?page=2`, { headers: ANGEMELDET })).text();
    assert.ok(mitte.includes('<a class="button" href="/filme">Zurück</a>'));          // Seite 1 steht ohne page
    assert.ok(mitte.includes('<a class="button" href="/filme?page=3">Weiter</a>'));
    const ende = await (await fetch(`${basis}/filme?page=3`, { headers: ANGEMELDET })).text();
    assert.ok(ende.includes('<a class="button" href="/filme?page=2">Zurück</a>'));
    assert.ok(ende.includes('<span class="button deaktiviert" aria-disabled="true">Weiter</span>'));
  });
});

// ---------- Fehler ----------

test("Eine abgelaufene Sitzung (401) löscht das Cookie und leitet zur Anmeldung", async () => {
  const bff = erstelleBff(() => {
    throw new BffFehler(401, "Invalid token.");
  });
  await mitServer(bff, async (basis) => {
    const antwort = await fetch(`${basis}/filme`, { headers: ANGEMELDET, redirect: "manual" });
    assert.strictEqual(antwort.status, 303);
    assert.strictEqual(antwort.headers.get("location"), "/anmelden?hinweis=abgelaufen");
    assert.ok(antwort.headers.getSetCookie()[0].startsWith("cinerate_token=;"));
  });
});

test("Ein ungültiger Filter (400) zeigt die Meldung mit Status 400", async () => {
  const bff = erstelleBff(() => {
    throw new BffFehler(400, "Invalid filter value.");
  });
  await mitServer(bff, async (basis) => {
    const antwort = await fetch(`${basis}/filme?genre=Unbekannt`, { headers: ANGEMELDET });
    const html = await antwort.text();
    assert.strictEqual(antwort.status, 400);
    assert.ok(html.includes("Bitte prüfe deine Eingaben."));
    assert.ok(html.includes('<form class="suche"'));     // das Formular bleibt sichtbar, man kann es noch einmal versuchen
  });
});

test("Ist das BFF nicht erreichbar, erscheint eine verständliche Meldung (503)", async () => {
  const bff = erstelleBff(() => {
    throw new BffFehler(0, "BFF nicht erreichbar");
  });
  await mitServer(bff, async (basis) => {
    const antwort = await fetch(`${basis}/filme`, { headers: ANGEMELDET });
    const html = await antwort.text();
    assert.strictEqual(antwort.status, 503);
    assert.ok(html.includes("Der Server ist gerade nicht erreichbar."));
  });
});