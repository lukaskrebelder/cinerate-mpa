// KI-Log B58: Erstellt mithilfe von KI (Claude Sonnett 5.5)
// Unit-Tests für die Hilfsfunktionen der Filmdetailseite aus lib/filmdetail.js.
const test = require("node:test");
const assert = require("node:assert");
const {
  istGueltigeFilmId,
  formatiereLaufzeit,
  formatiereFsk,
  formatiereDurchschnitt,
  bestimmeDetails,
  baueFilmPfad,
  uebersetzeDetailfehler,
} = require("../lib/filmdetail");

//--> istGueltigeFilmId

test("istGueltigeFilmId akzeptiert ganze Zahlen ab 1", () => {
  assert.strictEqual(istGueltigeFilmId("1"), true);
  assert.strictEqual(istGueltigeFilmId("157336"), true);
  assert.strictEqual(istGueltigeFilmId("2147483647"), true);
});

test("istGueltigeFilmId lehnt alles andere ab", () => {
  for (const wert of ["0", "-5", "abc", "12abc", "1.5", "", " 7", "1e3", "2147483648", "99999999999999999999", undefined, null, 7]) {
    assert.strictEqual(istGueltigeFilmId(wert), false, `Wert ${String(wert)}`);
  }
});

//--> formatiereLaufzeit

test("formatiereLaufzeit zeigt Stunden und Minuten", () => {
  assert.strictEqual(formatiereLaufzeit(169), "2 h 49 min");
  assert.strictEqual(formatiereLaufzeit(120), "2 h");
  assert.strictEqual(formatiereLaufzeit(45), "45 min");
});

test("formatiereLaufzeit meldet fehlende oder ungültige Werte als Keine Angabe", () => {
  for (const wert of [null, undefined, 0, -3, 1.5, "90"]) {
    assert.strictEqual(formatiereLaufzeit(wert), "Keine Angabe");
  }
});

//--> formatiereFsk

test("formatiereFsk kennt nur die offiziellen Stufen", () => {
  for (const stufe of [0, 6, 12, 16, 18]) assert.strictEqual(formatiereFsk(stufe), `FSK ${stufe}`);
  for (const wert of [null, undefined, 7, "12"]) assert.strictEqual(formatiereFsk(wert), "Keine Angabe");
});

//--> formatiereDurchschnitt

test("formatiereDurchschnitt schreibt eine Stelle mit Komma", () => {
  assert.strictEqual(formatiereDurchschnitt(4.3), "4,3 von 5");
  assert.strictEqual(formatiereDurchschnitt(5), "5,0 von 5");
});

test("formatiereDurchschnitt meldet fehlende Werte als Noch keine Bewertungen", () => {
  for (const wert of [null, undefined, "4.3", NaN]) {
    assert.strictEqual(formatiereDurchschnitt(wert), "Noch keine Bewertungen");
  }
});

//--> bestimmeDetails

test("bestimmeDetails liefert die vier Eckdaten in fester Reihenfolge", () => {
  const film = { releaseYear: 2014, runtime: 169, fsk: 12, avgRating: 4.5 };
  assert.deepStrictEqual(bestimmeDetails(film), [
    { bezeichnung: "Erscheinungsjahr", wert: "2014" },
    { bezeichnung: "Laufzeit", wert: "2 h 49 min" },
    { bezeichnung: "Altersfreigabe", wert: "FSK 12" },
    { bezeichnung: "Durchschnittliche Bewertung", wert: "4,5 von 5" },
  ]);
});

test("bestimmeDetails zeigt bei fehlenden Angaben Keine Angabe bzw. Noch keine Bewertungen", () => {
  const werte = bestimmeDetails({ releaseYear: null, runtime: null, fsk: null, avgRating: null }).map((d) => d.wert);
  assert.deepStrictEqual(werte, ["Keine Angabe", "Keine Angabe", "Keine Angabe", "Noch keine Bewertungen"]);
});

//--> baueFilmPfad

test("baueFilmPfad ohne Suche ergibt nur die Adresse des Films", () => {
  assert.strictEqual(baueFilmPfad(157336), "/film/157336");
  assert.strictEqual(baueFilmPfad(157336, { query: "", genre: "", page: 1 }), "/film/157336");
});

test("baueFilmPfad hängt ausgefüllte Suchfelder an und lässt Seite 1 weg", () => {
  assert.strictEqual(
    baueFilmPfad(7, { query: "Tom & Jerry", genre: "Action", page: 3 }),
    "/film/7?query=Tom+%26+Jerry&genre=Action&page=3"
  );
});

test("baueFilmPfad liefert bei einer ungültigen ID null", () => {
  for (const wert of [0, -1, 1.5, "7", null, undefined]) assert.strictEqual(baueFilmPfad(wert), null);
});

//--> uebersetzeDetailfehler

test("uebersetzeDetailfehler liefert für jeden Status einen deutschen Text", () => {
  assert.strictEqual(uebersetzeDetailfehler(404), "Diesen Film gibt es nicht.");
  for (const status of [0, 502, 503]) {
    assert.ok(uebersetzeDetailfehler(status).startsWith("Der Server ist gerade nicht erreichbar."));
  }
  assert.ok(uebersetzeDetailfehler(500).startsWith("Der Film konnte nicht geladen werden."));
});