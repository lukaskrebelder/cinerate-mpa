// KI-Log B14: Erstellt mithilfe von KI (Claude Sonnett 5.5)
// Tests für die Seiten der MPA (Startseite, Statusroute, Fehlerseiten).
// Die App läuft dabei auf einem freien Port, das BFF wird durch ein gefälschtes ersetzt.
const test = require("node:test");
const assert = require("node:assert");
const { createApp } = require("../app");

// Startet die App, ruft die Prüfung mit der Basis-URL auf und beendet den Server danach wieder.
async function mitServer(bff, pruefung) {
  const server = createApp({ bff }).listen(0);
  await new Promise((fertig) => server.once("listening", fertig));
  try {
    await pruefung(`http://localhost:${server.address().port}`);
  } finally {
    await new Promise((fertig) => server.close(fertig));
  }
}

const bffOk = { holeStatus: async () => ({ status: "ok", nachricht: "CineRate-BFF läuft" }) };
const bffDefekt = {
  holeStatus: async () => {
    throw new Error("BFF nicht erreichbar");
  },
};

test("Die Startseite liefert HTML mit Überschrift und Stylesheet", async () => {
  await mitServer(bffOk, async (basis) => {
    const antwort = await fetch(`${basis}/`);
    const html = await antwort.text();
    assert.strictEqual(antwort.status, 200);
    assert.match(antwort.headers.get("content-type"), /text\/html/);
    assert.ok(html.includes("Willkommen bei CineRate"));
    assert.ok(html.includes('<link rel="stylesheet" href="/style.css" />'));
  });
});

test("Auf der Startseite ist der Menüpunkt Start als aktiv markiert", async () => {
  await mitServer(bffOk, async (basis) => {
    const html = await (await fetch(`${basis}/`)).text();
    assert.match(html, /<a href="\/" class="aktiv">Start<\/a>/);
  });
});

test("Das Stylesheet wird als CSS ausgeliefert", async () => {
  await mitServer(bffOk, async (basis) => {
    const antwort = await fetch(`${basis}/style.css`);
    assert.strictEqual(antwort.status, 200);
    assert.match(antwort.headers.get("content-type"), /text\/css/);
  });
});

test("Eine unbekannte Adresse liefert die 404-Seite", async () => {
  await mitServer(bffOk, async (basis) => {
    const antwort = await fetch(`${basis}/gibt-es-nicht`);
    const html = await antwort.text();
    assert.strictEqual(antwort.status, 404);
    assert.ok(html.includes("Seite nicht gefunden"));
  });
});

test("Die Antworten verraten nicht, dass der Server Express nutzt", async () => {
  await mitServer(bffOk, async (basis) => {
    const antwort = await fetch(`${basis}/`);
    assert.strictEqual(antwort.headers.get("x-powered-by"), null);
  });
});

test("/status meldet die MPA und den Status des BFF", async () => {
  await mitServer(bffOk, async (basis) => {
    const antwort = await fetch(`${basis}/status`);
    const daten = await antwort.json();
    assert.strictEqual(antwort.status, 200);
    assert.strictEqual(daten.status, "ok");
    assert.strictEqual(daten.nachricht, "CineRate-MPA läuft");
    assert.strictEqual(daten.bff.nachricht, "CineRate-BFF läuft");
  });
});

test("/status liefert 502, wenn das BFF nicht erreichbar ist", async () => {
  await mitServer(bffDefekt, async (basis) => {
    const antwort = await fetch(`${basis}/status`);
    const daten = await antwort.json();
    assert.strictEqual(antwort.status, 502);
    assert.strictEqual(daten.status, "error");
    assert.strictEqual(daten.nachricht, "BFF nicht erreichbar");
  });
});

test("/status nennt den Status, wenn das BFF mit einem Fehler antwortet", async () => {
  const bff503 = {
    holeStatus: async () => {
      const fehler = new Error("");
      fehler.status = 503;
      throw fehler;
    },
  };
  await mitServer(bff503, async (basis) => {
    const antwort = await fetch(`${basis}/status`);
    const daten = await antwort.json();
    assert.strictEqual(antwort.status, 502);
    assert.strictEqual(daten.nachricht, "BFF antwortet mit Status 503");
  });
});