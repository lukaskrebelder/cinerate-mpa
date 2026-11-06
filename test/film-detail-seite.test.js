// KI-Log B58: Erstellt mithilfe von KI (Claude Sonnett 5.5)
// Tests für die Detailseite /film/:movieId der MPA und für die Links in der Trefferliste.
// Die App läuft auf einem freien Port, das BFF wird durch ein gefälschtes ersetzt,
// das jeden Aufruf merkt. So sieht man, was die MPA ans BFF geschickt hat.
const test = require("node:test");
const assert = require("node:assert");
const { createApp } = require("../app");
const { BffFehler } = require("../lib/bff");

// Gefälschtes BFF. film(movieId, token) liefert den Film oder wirft einen Fehler.
function erstelleBff(film, suche = () => ({ page: 1, totalPages: 1, movies: [] })) {
  const aufrufe = [];
  return {
    aufrufe,
    holeStatus: async () => ({ status: "ok" }),
    anfrage: async () => ({}),
    sucheFilme: async (eingaben) => suche(eingaben),
    holeFilm: async (movieId, token) => {
      aufrufe.push({ movieId, token });
      return film(movieId, token);
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

const interstellar = {
  movieId: 157336,
  title: "Interstellar",
  description: "Eine Reise durch ein Wurmloch.",
  genres: ["Science Fiction", "Drama"],
  fsk: 12,
  posterUrl: "https://image.tmdb.org/t/p/w500/a.jpg",
  releaseYear: 2014,
  runtime: 169,
  avgRating: 4.5,
};

// ---------- Zugriff ----------

test("/film/:id leitet Gäste mit einem Hinweis zur Anmeldung", async () => {
  const bff = erstelleBff(() => interstellar);
  await mitServer(bff, async (basis) => {
    const antwort = await fetch(`${basis}/film/157336`, { redirect: "manual" });
    assert.strictEqual(antwort.status, 303);
    assert.strictEqual(antwort.headers.get("location"), "/anmelden?hinweis=anmeldung");
    assert.strictEqual(bff.aufrufe.length, 0);
  });
});

// ---------- Anzeige ----------

test("Die Detailseite zeigt Poster, Titel, Genres, Eckdaten und Beschreibung", async () => {
  await mitServer(erstelleBff(() => interstellar), async (basis) => {
    const antwort = await fetch(`${basis}/film/157336`, { headers: ANGEMELDET });
    const html = await antwort.text();
    assert.strictEqual(antwort.status, 200);
    assert.ok(html.includes('<img src="https://image.tmdb.org/t/p/w500/a.jpg" alt="Poster zu Interstellar" />'));
    assert.ok(html.includes("<h1>Interstellar</h1>"));
    assert.ok(html.includes("<title>Interstellar – CineRate</title>"));
    assert.ok(html.includes("<li>Science Fiction</li>"));
    assert.ok(html.includes("<li>Drama</li>"));
    assert.ok(html.includes("<dt>Erscheinungsjahr</dt>"));
    assert.ok(html.includes("<dd>2014</dd>"));
    assert.ok(html.includes("<dd>2 h 49 min</dd>"));
    assert.ok(html.includes("<dd>FSK 12</dd>"));
    assert.ok(html.includes("<dd>4,5 von 5</dd>"));
    assert.ok(html.includes("Eine Reise durch ein Wurmloch."));
  });
});

test("Die Detailseite ruft das BFF mit der Film-ID als Zahl und dem Token auf", async () => {
  const bff = erstelleBff(() => interstellar);
  await mitServer(bff, async (basis) => {
    await fetch(`${basis}/film/157336`, { headers: ANGEMELDET });
    assert.strictEqual(bff.aufrufe.length, 1);
    assert.strictEqual(bff.aufrufe[0].movieId, 157336);
    assert.strictEqual(bff.aufrufe[0].token, "tok_abc");
  });
});

test("Ohne Poster oder mit fremder Bild-Adresse steht der Platzhalter da", async () => {
  for (const posterUrl of [null, "https://evil.example.com/x.jpg"]) {
    await mitServer(erstelleBff(() => ({ ...interstellar, posterUrl })), async (basis) => {
      const html = await (await fetch(`${basis}/film/157336`, { headers: ANGEMELDET })).text();
      assert.ok(html.includes("Kein Poster"));
      assert.ok(!html.includes("evil.example.com"));
      assert.ok(!html.includes("<img"));
    });
  }
});

test("Fehlende Angaben werden benannt, ohne Genres gibt es keine Genre-Liste", async () => {
  const leer = { movieId: 5, title: "Unbekannt", description: null, genres: [], fsk: null, posterUrl: null, releaseYear: null, runtime: null, avgRating: null };
  await mitServer(erstelleBff(() => leer), async (basis) => {
    const html = await (await fetch(`${basis}/film/5`, { headers: ANGEMELDET })).text();
    assert.ok(html.includes("Zu diesem Film gibt es keine Beschreibung."));
    assert.ok(html.includes("Noch keine Bewertungen"));
    assert.strictEqual((html.match(/Keine Angabe/g) ?? []).length, 3);   // Jahr, Laufzeit, Altersfreigabe
    assert.ok(!html.includes("genre-liste"));
  });
});

test("Titel, Beschreibung und Genres werden maskiert (kein Schadcode auf der Seite)", async () => {
  const gefaehrlich = {
    ...interstellar,
    title: "<script>alert(1)</script>",
    description: "<img src=x onerror=alert(2)>",
    genres: ["<b>fett</b>"],
  };
  await mitServer(erstelleBff(() => gefaehrlich), async (basis) => {
    const html = await (await fetch(`${basis}/film/157336`, { headers: ANGEMELDET })).text();
    assert.ok(!html.includes("<script>alert(1)</script>"));
    assert.ok(!html.includes("<img src=x"));
    assert.ok(!html.includes("<b>fett</b>"));
    assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
    assert.ok(html.includes("&lt;img src=x onerror=alert(2)&gt;"));
  });
});

// ---------- Navigation ----------

test("Der Link Zurück führt zur Filmsuche und behält die Suche aus der Adresse", async () => {
  await mitServer(erstelleBff(() => interstellar), async (basis) => {
    const ohne = await (await fetch(`${basis}/film/157336`, { headers: ANGEMELDET })).text();
    assert.ok(ohne.includes('<a class="zurueck-link" href="/filme">← Zurück zur Filmsuche</a>'));
    const mit = await (await fetch(`${basis}/film/157336?query=Tom+%26+Jerry&genre=Action&page=2`, { headers: ANGEMELDET })).text();
    assert.ok(mit.includes('href="/filme?query=Tom+%26+Jerry&amp;genre=Action&amp;page=2"'));
  });
});

test("Auf der Detailseite ist der Menüpunkt Filme als aktiv markiert", async () => {
  await mitServer(erstelleBff(() => interstellar), async (basis) => {
    const html = await (await fetch(`${basis}/film/157336`, { headers: ANGEMELDET })).text();
    assert.match(html, /<a href="\/filme" class="aktiv">Filme<\/a>/);
  });
});

test("Die Karten der Trefferliste verlinken auf die Detailseite und behalten die Suche", async () => {
  const treffer = () => ({
    page: 2,
    totalPages: 3,
    movies: [
      { movieId: 1, title: "Interstellar", posterUrl: null },
      { movieId: "kaputt", title: "Ohne gültige ID", posterUrl: null },
    ],
  });
  await mitServer(erstelleBff(() => interstellar, treffer), async (basis) => {
    const html = await (await fetch(`${basis}/filme?query=Matrix&genre=Action&page=2`, { headers: ANGEMELDET })).text();
    assert.ok(html.includes('<a class="film-link" href="/film/1?query=Matrix&amp;genre=Action&amp;page=2">'));
    assert.strictEqual((html.match(/class="film-link"/g) ?? []).length, 1);   // ohne gültige ID gibt es keinen Link
    assert.ok(html.includes("Ohne gültige ID"));
  });
});

// ---------- Fehler ----------

test("Eine ungültige Film-ID wird nicht ans BFF geschickt und zeigt 404", async () => {
  const bff = erstelleBff(() => interstellar);
  await mitServer(bff, async (basis) => {
    for (const id of ["abc", "0", "99999999999", "1.5"]) {
      const antwort = await fetch(`${basis}/film/${id}`, { headers: ANGEMELDET });
      const html = await antwort.text();
      assert.strictEqual(antwort.status, 404, `ID ${id}`);
      assert.ok(html.includes("Diesen Film gibt es nicht."));
      assert.ok(html.includes("zurueck-link"));     // man kommt von der Fehlerseite zurück zur Suche
    }
    assert.strictEqual(bff.aufrufe.length, 0);
  });
});

test("Ein unbekannter Film (404 vom BFF) zeigt die Meldung mit Status 404", async () => {
  const bff = erstelleBff(() => {
    throw new BffFehler(404, "No movie found for this ID.");
  });
  await mitServer(bff, async (basis) => {
    const antwort = await fetch(`${basis}/film/999999`, { headers: ANGEMELDET });
    const html = await antwort.text();
    assert.strictEqual(antwort.status, 404);
    assert.ok(html.includes("Diesen Film gibt es nicht."));
  });
});

test("Eine abgelaufene Sitzung (401) löscht das Cookie und leitet zur Anmeldung", async () => {
  const bff = erstelleBff(() => {
    throw new BffFehler(401, "Invalid token.");
  });
  await mitServer(bff, async (basis) => {
    const antwort = await fetch(`${basis}/film/157336`, { headers: ANGEMELDET, redirect: "manual" });
    assert.strictEqual(antwort.status, 303);
    assert.strictEqual(antwort.headers.get("location"), "/anmelden?hinweis=abgelaufen");
    assert.ok(antwort.headers.getSetCookie()[0].startsWith("cinerate_token=;"));
  });
});

test("Ist das BFF nicht erreichbar, erscheint eine verständliche Meldung (503)", async () => {
  const bff = erstelleBff(() => {
    throw new BffFehler(0, "BFF nicht erreichbar");
  });
  await mitServer(bff, async (basis) => {
    const antwort = await fetch(`${basis}/film/157336`, { headers: ANGEMELDET });
    const html = await antwort.text();
    assert.strictEqual(antwort.status, 503);
    assert.ok(html.includes("Der Server ist gerade nicht erreichbar."));
  });
});

test("Ein unerwarteter Fehler zeigt die allgemeine Meldung mit dem Status des Fehlers", async () => {
  const bff = erstelleBff(() => {
    throw new BffFehler(500, "Boom");
  });
  await mitServer(bff, async (basis) => {
    const antwort = await fetch(`${basis}/film/157336`, { headers: ANGEMELDET });
    const html = await antwort.text();
    assert.strictEqual(antwort.status, 500);
    assert.ok(html.includes("Der Film konnte nicht geladen werden."));
    assert.ok(!html.includes("Boom"));     // die Meldung des Servers wird nicht angezeigt
  });
});