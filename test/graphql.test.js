// KI-Log B21: Erstellt mithilfe von KI (Claude Sonnett 5.5)
// Unit-Tests für die GraphQL-Suche aus lib/bff.js (PB-23).
const test = require("node:test");
const assert = require("node:assert");
const { sucheFilme, holeFilm, graphql, statusAusGraphqlFehler, BffFehler } = require("../lib/bff");

// Ersetzt fetch für einen Test durch eine eigene Funktion und merkt sich den Aufruf.
// Nach dem Test wird das echte fetch wiederhergestellt.
async function mitFetch(ersatz, pruefung) {
  const original = globalThis.fetch;
  const aufrufe = [];
  globalThis.fetch = async (url, optionen) => {
    aufrufe.push({ url, optionen });
    return ersatz(url, optionen);
  };
  try {
    await pruefung(aufrufe);
  } finally {
    globalThis.fetch = original;
  }
}

// Baut eine Antwort, wie fetch sie liefert (ok, status und json()).
function antwort(status, inhalt) {
  return { ok: status >= 200 && status < 300, status, json: async () => inhalt };
}

process.env.BFF_URL = "http://bff.test";

const treffer = { page: 1, totalPages: 3, movies: [{ movieId: 157336, title: "Interstellar", posterUrl: null }] };

//--> statusAusGraphqlFehler

test("statusAusGraphqlFehler leitet den Statuscode aus der Meldung des BFF ab", () => {
  assert.strictEqual(statusAusGraphqlFehler("Invalid token."), 401);
  assert.strictEqual(statusAusGraphqlFehler("Invalid filter value."), 400);
  assert.strictEqual(statusAusGraphqlFehler("Backend is not reachable."), 503);
  assert.strictEqual(statusAusGraphqlFehler("Search is currently unavailable."), 503);
});

test("statusAusGraphqlFehler liefert bei unbekannten Meldungen 500", () => {
  assert.strictEqual(statusAusGraphqlFehler("etwas anderes"), 500);
  assert.strictEqual(statusAusGraphqlFehler(undefined), 500);
});

//--> sucheFilme

test("sucheFilme schickt POST an /bff/graphql mit Abfrage, Variablen und Token", async () => {
  await mitFetch(
    () => antwort(200, { data: { filme: treffer } }),
    async (aufrufe) => {
      const ergebnis = await sucheFilme({ query: "Interstellar", genre: "Science Fiction", page: 2 }, "abc123");
      assert.strictEqual(aufrufe[0].url, "http://bff.test/bff/graphql");
      assert.strictEqual(aufrufe[0].optionen.method, "POST");
      assert.strictEqual(aufrufe[0].optionen.headers.Authorization, "Bearer abc123");
      const body = JSON.parse(aufrufe[0].optionen.body);
      assert.ok(body.query.includes("filme(query: $query, genre: $genre, page: $page)"));
      assert.deepStrictEqual(body.variables, { query: "Interstellar", genre: "Science Fiction", page: 2 });
      assert.deepStrictEqual(ergebnis, treffer);
    }
  );
});

test("sucheFilme lässt leere Eingaben bei den Variablen weg", async () => {
  await mitFetch(
    () => antwort(200, { data: { filme: treffer } }),
    async (aufrufe) => {
      await sucheFilme({ query: "", genre: "", page: 1 }, "abc123");
      assert.deepStrictEqual(JSON.parse(aufrufe[0].optionen.body).variables, { page: 1 });
    }
  );
});

test("sucheFilme wirft bei einem GraphQL-Fehler einen BffFehler mit abgeleitetem Statuscode", async () => {
  await mitFetch(
    () => antwort(200, { data: null, errors: [{ message: "Invalid token." }] }),
    async () => {
      await assert.rejects(sucheFilme({}, "abgelaufen"), (fehler) => {
        assert.ok(fehler instanceof BffFehler);
        assert.strictEqual(fehler.status, 401);
        assert.strictEqual(fehler.message, "Invalid token.");
        return true;
      });
    }
  );
});

test("sucheFilme wirft bei einem ungültigen Filter (400) einen BffFehler mit Status 400", async () => {
  await mitFetch(
    () => antwort(200, { data: null, errors: [{ message: "Invalid filter value." }] }),
    async () => {
      await assert.rejects(sucheFilme({ genre: "Unbekannt" }, "abc"), (fehler) => fehler.status === 400);
    }
  );
});

test("sucheFilme wirft bei einem HTTP-Fehler des BFF einen BffFehler mit diesem Status", async () => {
  await mitFetch(
    () => antwort(503, { message: "Backend is not reachable." }),
    async () => {
      await assert.rejects(sucheFilme({}, "abc"), (fehler) => fehler instanceof BffFehler && fehler.status === 503);
    }
  );
});

test("sucheFilme wirft bei Netzwerkfehler einen BffFehler mit Status 0", async () => {
  await mitFetch(
    () => {
      throw new TypeError("fetch failed");
    },
    async () => {
      await assert.rejects(sucheFilme({}, "abc"), (fehler) => fehler instanceof BffFehler && fehler.status === 0);
    }
  );
});

test("sucheFilme wirft bei einer Antwort ohne Trefferliste einen BffFehler mit Status 502", async () => {
  await mitFetch(
    () => antwort(200, { data: { filme: null } }),
    async () => {
      await assert.rejects(sucheFilme({}, "abc"), (fehler) => fehler.status === 502);
    }
  );
});

//--> graphql

test("graphql liefert die Daten der Antwort", async () => {
  await mitFetch(
    () => antwort(200, { data: { hallo: "welt" } }),
    async () => {
      assert.deepStrictEqual(await graphql("query { hallo }", {}, { token: "abc" }), { hallo: "welt" });
    }
  );
});


// KI-Log B58: Erstellt mithilfe von KI (Claude Sonnett 5.5) – Tests für die GraphQL-Abfrage der Filmdetailseite
//--> holeFilm
const film = {
  movieId: 157336,
  title: "Interstellar",
  description: "Eine Reise durch ein Wurmloch.",
  genres: ["Science Fiction", "Drama"],
  fsk: 12,
  posterUrl: null,
  releaseYear: 2014,
  runtime: 169,
  avgRating: 4.5,
};

test("statusAusGraphqlFehler erkennt einen unbekannten Film als 404", () => {
  assert.strictEqual(statusAusGraphqlFehler("No movie found for this ID."), 404);
});

test("holeFilm schickt POST an /bff/graphql mit Abfrage, Film-ID und Token", async () => {
  await mitFetch(
    () => antwort(200, { data: { film } }),
    async (aufrufe) => {
      const ergebnis = await holeFilm(157336, "abc123");
      assert.strictEqual(aufrufe[0].url, "http://bff.test/bff/graphql");
      assert.strictEqual(aufrufe[0].optionen.method, "POST");
      assert.strictEqual(aufrufe[0].optionen.headers.Authorization, "Bearer abc123");
      const body = JSON.parse(aufrufe[0].optionen.body);
      assert.ok(body.query.includes("film(movieId: $movieId)"));
      for (const feld of ["title", "description", "genres", "fsk", "posterUrl", "releaseYear", "runtime", "avgRating"]) {
        assert.ok(body.query.includes(feld), `Feld ${feld} fehlt in der Abfrage`);
      }
      assert.deepStrictEqual(body.variables, { movieId: 157336 });
      assert.deepStrictEqual(ergebnis, film);
    }
  );
});

test("holeFilm wirft bei einem unbekannten Film einen BffFehler mit Status 404", async () => {
  await mitFetch(
    () => antwort(200, { data: null, errors: [{ message: "No movie found for this ID." }] }),
    async () => {
      await assert.rejects(holeFilm(1, "abc"), (fehler) => fehler instanceof BffFehler && fehler.status === 404);
    }
  );
});

test("holeFilm wirft bei einer abgelaufenen Sitzung einen BffFehler mit Status 401", async () => {
  await mitFetch(
    () => antwort(200, { data: null, errors: [{ message: "Invalid token." }] }),
    async () => {
      await assert.rejects(holeFilm(1, "alt"), (fehler) => fehler.status === 401);
    }
  );
});

test("holeFilm wirft bei einer Antwort ohne Film einen BffFehler mit Status 502", async () => {
  for (const inhalt of [{ data: { film: null } }, { data: { film: { movieId: 1 } } }, { data: null }]) {
    await mitFetch(
      () => antwort(200, inhalt),
      async () => {
        await assert.rejects(holeFilm(1, "abc"), (fehler) => fehler.status === 502);
      }
    );
  }
});

test("holeFilm wirft bei Netzwerkfehler einen BffFehler mit Status 0", async () => {
  await mitFetch(
    () => {
      throw new TypeError("fetch failed");
    },
    async () => {
      await assert.rejects(holeFilm(1, "abc"), (fehler) => fehler instanceof BffFehler && fehler.status === 0);
    }
  );
});