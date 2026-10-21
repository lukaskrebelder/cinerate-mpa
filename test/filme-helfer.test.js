// KI-Log B20: Erstellt mithilfe von KI (Claude Sonnett 5.5)
// Unit-Tests für die Hilfsfunktionen der Filmsuche aus lib/filme.js und lib/hinweise.js (PB-23).
const test = require("node:test");
const assert = require("node:assert");
const {
  leseSeite,
  leseText,
  istSichereBildUrl,
  baueSuchpfad,
  bestimmeSeitenanzeige,
  uebersetzeSuchfehler,
} = require("../lib/filme");
const { findeHinweis } = require("../lib/hinweise");
const { GENRES } = require("../lib/genres");

//--> leseSeite

test("leseSeite liest eine gültige Seitennummer", () => {
  assert.strictEqual(leseSeite("3"), 3);
});

test("leseSeite ergibt Seite 1 bei fehlender, ungültiger oder zu kleiner Angabe", () => {
  for (const wert of [undefined, "", "0", "-2", "abc", "2.5", ["2", "3"], { a: 1 }]) {
    assert.strictEqual(leseSeite(wert), 1);
  }
});

//--> leseText

test("leseText entfernt Leerzeichen am Rand", () => {
  assert.strictEqual(leseText("  Matrix  "), "Matrix");
});

test("leseText ergibt bei fehlender oder doppelter Angabe einen leeren Text", () => {
  assert.strictEqual(leseText(undefined), "");
  assert.strictEqual(leseText(["a", "b"]), "");
});

test("leseText kürzt sehr lange Eingaben auf 200 Zeichen", () => {
  assert.strictEqual(leseText("x".repeat(500)).length, 200);
});

//--> istSichereBildUrl

test("istSichereBildUrl akzeptiert Adressen von TMDB", () => {
  assert.strictEqual(istSichereBildUrl("https://image.tmdb.org/t/p/w500/abc.jpg"), true);
});

test("istSichereBildUrl lehnt fremde Adressen, unsichere Adressen und Nicht-Text ab", () => {
  assert.strictEqual(istSichereBildUrl("https://evil.example.com/bild.jpg"), false);
  assert.strictEqual(istSichereBildUrl("http://image.tmdb.org/t/p/w500/abc.jpg"), false);
  assert.strictEqual(istSichereBildUrl("javascript:alert(1)"), false);
  assert.strictEqual(istSichereBildUrl(null), false);
});

//--> baueSuchpfad

test("baueSuchpfad liefert ohne Eingaben nur /filme", () => {
  assert.strictEqual(baueSuchpfad(), "/filme");
  assert.strictEqual(baueSuchpfad({ query: "", genre: "", page: 1 }), "/filme");
});

test("baueSuchpfad nimmt Titel, Genre und Seite in die Adresse auf und kodiert Sonderzeichen", () => {
  assert.strictEqual(
    baueSuchpfad({ query: "Tom & Jerry", genre: "Science Fiction", page: 2 }),
    "/filme?query=Tom+%26+Jerry&genre=Science+Fiction&page=2"
  );
});

test("baueSuchpfad lässt Seite 1 und ungültige Seiten weg", () => {
  assert.strictEqual(baueSuchpfad({ query: "Matrix", page: 1 }), "/filme?query=Matrix");
  assert.strictEqual(baueSuchpfad({ query: "Matrix", page: 0 }), "/filme?query=Matrix");
});

//--> bestimmeSeitenanzeige

test("bestimmeSeitenanzeige zeigt auf der ersten Seite nur Weiter", () => {
  assert.deepStrictEqual(bestimmeSeitenanzeige(1, 5), { text: "Seite 1 von 5", hatZurueck: false, hatWeiter: true });
});

test("bestimmeSeitenanzeige zeigt auf der letzten Seite nur Zurück", () => {
  assert.deepStrictEqual(bestimmeSeitenanzeige(5, 5), { text: "Seite 5 von 5", hatZurueck: true, hatWeiter: false });
});

test("bestimmeSeitenanzeige geht bei ungültiger Gesamtzahl von einer Seite aus", () => {
  assert.deepStrictEqual(bestimmeSeitenanzeige(1, 0), { text: "Seite 1 von 1", hatZurueck: false, hatWeiter: false });
  assert.deepStrictEqual(bestimmeSeitenanzeige(1, undefined), { text: "Seite 1 von 1", hatZurueck: false, hatWeiter: false });
});

//--> uebersetzeSuchfehler

test("uebersetzeSuchfehler meldet bei 400 falsche Eingaben", () => {
  assert.strictEqual(uebersetzeSuchfehler(400), "Bitte prüfe deine Eingaben.");
});

test("uebersetzeSuchfehler meldet bei 0, 502 und 503 einen nicht erreichbaren Server", () => {
  const erwartet = "Der Server ist gerade nicht erreichbar. Bitte versuche es später noch einmal.";
  for (const status of [0, 502, 503]) assert.strictEqual(uebersetzeSuchfehler(status), erwartet);
});

test("uebersetzeSuchfehler hat für andere Status einen allgemeinen Text", () => {
  assert.strictEqual(uebersetzeSuchfehler(500), "Die Suche ist fehlgeschlagen. Bitte versuche es später noch einmal.");
});

//--> findeHinweis

test("findeHinweis liefert den Text zu einem bekannten Stichwort", () => {
  assert.strictEqual(findeHinweis("abgelaufen"), "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.");
  assert.strictEqual(findeHinweis("anmeldung"), "Bitte melde dich an, um diese Seite zu sehen.");
});

test("findeHinweis liefert null bei unbekannten Stichworten, auch bei Namen aus dem Objekt-Prototyp", () => {
  for (const wert of ["gibt-es-nicht", "", "toString", "__proto__", undefined, ["abgelaufen"]]) {
    assert.strictEqual(findeHinweis(wert), null);
  }
});

//--> GENRES

test("Die Genreliste enthält keine Doppelten und keine leeren Namen", () => {
  assert.strictEqual(new Set(GENRES).size, GENRES.length);
  assert.ok(GENRES.every((name) => name.trim() !== ""));
  assert.ok(GENRES.includes("Science Fiction"));
});