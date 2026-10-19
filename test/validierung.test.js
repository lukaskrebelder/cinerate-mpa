// KI-Log B19: Erstellt mithilfe von KI (Claude Sonnett 5.5)
// Gleiche Tests wie in SPA und Backend --> copy pasted mit kleinen Syntaxänderungen
// Unit-Tests für die Prüfregeln aus lib/validierung.js (US-2).
const test = require("node:test");
const assert = require("node:assert");
const {
  normalizeEmail,
  isValidEmail,
  isValidPassword,
  isNonEmptyText,
  findeRegistrierungsfehler,
  findeAnmeldefehler,
} = require("../lib/validierung");

test("normalizeEmail entfernt Leerzeichen am Rand und schreibt klein", () => {
  assert.strictEqual(normalizeEmail("  Max@Example.COM "), "max@example.com");
});

test("normalizeEmail liefert bei einem Nicht-Text einen leeren Text", () => {
  assert.strictEqual(normalizeEmail(undefined), "");
  assert.strictEqual(normalizeEmail(42), "");
});

test("isValidEmail erkennt gültige und ungültige Adressen", () => {
  assert.strictEqual(isValidEmail("max@example.com"), true);
  assert.strictEqual(isValidEmail("max@example"), false);
  assert.strictEqual(isValidEmail("max example@x.de"), false);
  assert.strictEqual(isValidEmail(""), false);
});

test("isValidPassword verlangt mindestens 8 Zeichen", () => {
  assert.strictEqual(isValidPassword("1234567"), false);
  assert.strictEqual(isValidPassword("12345678"), true);
});

test("isNonEmptyText lehnt leere Texte und reine Leerzeichen ab", () => {
  assert.strictEqual(isNonEmptyText("Max"), true);
  assert.strictEqual(isNonEmptyText("   "), false);
  assert.strictEqual(isNonEmptyText(undefined), false);
});

test("findeRegistrierungsfehler liefert bei gültigen Daten eine leere Liste", () => {
  const daten = { firstName: "Max", lastName: "Muster", email: "max@example.com", password: "geheim123" };
  assert.deepStrictEqual(findeRegistrierungsfehler(daten), []);
});

test("findeRegistrierungsfehler sammelt alle Fehler als Texte", () => {
  const fehler = findeRegistrierungsfehler({ firstName: " ", lastName: "", email: "kaputt", password: "123" });
  assert.deepStrictEqual(fehler, [
    "Bitte gib deinen Vornamen ein.",
    "Bitte gib deinen Nachnamen ein.",
    "Bitte gib eine gültige E-Mail-Adresse ein.",
    "Das Passwort muss mindestens 8 Zeichen lang sein.",
  ]);
});

test("findeRegistrierungsfehler meldet bei fehlenden Daten alle vier Fehler", () => {
  assert.strictEqual(findeRegistrierungsfehler(undefined).length, 4);
});

test("findeAnmeldefehler liefert bei ausgefüllten Feldern eine leere Liste", () => {
  assert.deepStrictEqual(findeAnmeldefehler({ email: "max@example.com", password: "x" }), []);
});

test("findeAnmeldefehler meldet fehlende E-Mail und fehlendes Passwort", () => {
  assert.deepStrictEqual(findeAnmeldefehler({ email: "  ", password: "geheim123" }), [
    "Bitte gib deine E-Mail-Adresse ein.",
  ]);
  assert.deepStrictEqual(findeAnmeldefehler({ email: "max@example.com", password: "" }), [
    "Bitte gib dein Passwort ein.",
  ]);
  assert.strictEqual(findeAnmeldefehler({}).length, 2);
});