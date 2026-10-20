// KI-Log B18: Erstellt mithilfe von KI (Claude Sonnett 5.5)
// Unit-Tests für die Menüpunkte aus lib/navigation.js.
// --> Ähnlich wie in SPA, daher nahezu copy-paste
const test = require("node:test");
const assert = require("node:assert");
const { bestimmeMenuepunkte } = require("../lib/navigation");

test("Gäste sehen Start, Anmelden und Registrieren", () => {
  const texte = bestimmeMenuepunkte(false).map((punkt) => punkt.text);
  assert.deepStrictEqual(texte, ["Start", "Anmelden", "Registrieren"]);
});

test("Angemeldete Nutzer sehen Start, Filme und Abmelden", () => {
  const texte = bestimmeMenuepunkte(true).map((punkt) => punkt.text);
  assert.deepStrictEqual(texte, ["Start", "Filme", "Abmelden"]);
});

test("Filme führt auf die Seite /filme und wird Gästen nicht angezeigt", () => {
  assert.strictEqual(bestimmeMenuepunkte(true).find((p) => p.text === "Filme").pfad, "/filme");
  const texteGast = bestimmeMenuepunkte(false).map((punkt) => punkt.text);
  assert.strictEqual(texteGast.includes("Filme"), false);
});

test("Abmelden ist eine Aktion, die anderen Punkte sind Links", () => {
  const punkte = bestimmeMenuepunkte(true);
  const abmelden = punkte.find((p) => p.text === "Abmelden");
  assert.strictEqual(abmelden.aktion, "abmelden");
  assert.strictEqual(abmelden.pfad, undefined);
  assert.strictEqual(punkte[0].pfad, "/");
});

test("Die Links für Gäste führen auf die Seiten Anmelden und Registrieren", () => {
  const punkte = bestimmeMenuepunkte(false);
  assert.strictEqual(punkte[1].pfad, "/anmelden");
  assert.strictEqual(punkte[2].pfad, "/registrieren");
});