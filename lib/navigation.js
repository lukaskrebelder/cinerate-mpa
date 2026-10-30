// Menüpunkte im Header. Welche sichtbar sind, hängt davon ab, ob der Nutzer angemeldet ist.
// Gäste sehen "Anmelden" und "Registrieren", angemeldete Nutzer sehen "Filme" und "Abmelden".
// Ein Punkt mit "pfad" ist ein Link auf eine Seite, ein Punkt mit "aktion" löst etwas aus 
// --> Abmelden ist ein Formular, weil es etwas ändert
function bestimmeMenuepunkte(angemeldet) {
  const start = { text: "Start", pfad: "/" };

  if (angemeldet) {
        return [start, { text: "Filme", pfad: "/filme" }, { text: "Abmelden", aktion: "abmelden" }];
  }
  return [
    start,
    { text: "Anmelden", pfad: "/anmelden" },
    { text: "Registrieren", pfad: "/registrieren" },
  ];
}

module.exports = { bestimmeMenuepunkte }; 