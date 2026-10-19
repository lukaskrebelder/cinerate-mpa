// KI-Log B17: Erstellt mithilfe von KI (Claude Sonnett 5.5)
// Unit-Tests für die Fehlertexte aus lib/fehlertexte.js (US-2).
// --> Ähnlich aus SPA und Backend --> quasi copy-paste
const test = require("node:test");
const assert = require("node:assert");
const { uebersetzeRegistrierungsfehler, uebersetzeAnmeldefehler } = require("../lib/fehlertexte");

const NICHT_ERREICHBAR = "Der Server ist gerade nicht erreichbar. Bitte versuche es später noch einmal.";

test("uebersetzeRegistrierungsfehler meldet bei 409, dass es das Konto schon gibt", () => {
  assert.strictEqual(
    uebersetzeRegistrierungsfehler(409),
    "Mit dieser E-Mail-Adresse gibt es bereits ein Konto."
  );
});

test("uebersetzeRegistrierungsfehler meldet bei 400 falsche Eingaben", () => {
  assert.strictEqual(uebersetzeRegistrierungsfehler(400), "Bitte prüfe deine Eingaben.");
});

test("uebersetzeRegistrierungsfehler meldet bei 0, 502 und 503 einen nicht erreichbaren Server", () => {
  for (const status of [0, 502, 503]) {
    assert.strictEqual(uebersetzeRegistrierungsfehler(status), NICHT_ERREICHBAR);
  }
});

test("uebersetzeRegistrierungsfehler hat für andere Status einen allgemeinen Text", () => {
  assert.strictEqual(
    uebersetzeRegistrierungsfehler(500),
    "Die Registrierung ist fehlgeschlagen. Bitte versuche es später noch einmal."
  );
});

test("uebersetzeAnmeldefehler meldet bei 401 falsche Zugangsdaten, ohne zu verraten, was falsch war", () => {
  assert.strictEqual(uebersetzeAnmeldefehler(401), "E-Mail-Adresse oder Passwort ist falsch.");
});

test("uebersetzeAnmeldefehler meldet bei 400 fehlende Eingaben", () => {
  assert.strictEqual(uebersetzeAnmeldefehler(400), "Bitte gib E-Mail-Adresse und Passwort ein.");
});

test("uebersetzeAnmeldefehler meldet bei 0, 502 und 503 einen nicht erreichbaren Server", () => {
  for (const status of [0, 502, 503]) {
    assert.strictEqual(uebersetzeAnmeldefehler(status), NICHT_ERREICHBAR);
  }
});

test("uebersetzeAnmeldefehler hat für andere Status einen allgemeinen Text", () => {
  assert.strictEqual(
    uebersetzeAnmeldefehler(500),
    "Die Anmeldung ist fehlgeschlagen. Bitte versuche es später noch einmal."
  );
});