// Alle Aufrufe der MPA an das BFF laufen über diese Datei.
// Die MPA spricht nur mit dem BFF, nie direkt mit dem Backend oder der TMDB-API.

// Alle Routen des BFF beginnen mit dem Präfix /bff
const PRAEFIX = "/bff";

// So lange wartet die MPA höchstens auf das BFF, bevor die Seite trotzdem antwortet
const TIMEOUT_MS = 5000;

// Basis-URL des BFF. Wird bei jedem Aufruf gelesen, damit Tests sie ändern können.
// Ein Schrägstrich am Ende wird entfernt, damit keine doppelten Schrägstriche entstehen.
function basisUrl() {
  return (process.env.BFF_URL || "http://localhost:4000").replace(/\/+$/, "");
}

// Fehler, den anfrage() wirft, wenn das BFF einen Fehlerstatus liefert oder nicht erreichbar ist
class BffFehler extends Error {
  constructor(status, nachricht) {
    super(nachricht);
    this.status = status;
  }
}

// Allgemeine Anfrage an das BFF. Falls ein Token übergeben wird, geht es im Header mit.
async function anfrage(pfad, { methode = "GET", daten, token } = {

}) {
  const kopfzeilen = { "Content-Type": "application/json" };
  if (token) {
    kopfzeilen.Authorization = `Bearer ${token}`;
  }

  let antwort;  //--> Variable, die im nachhinein noch andere Werte annehmen kann.
  try {
    antwort = await fetch(`${basisUrl()}${PRAEFIX}${pfad}`, {
      method: methode,
      headers: kopfzeilen,
      body: daten === undefined ? undefined : JSON.stringify(daten),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    // fetch wirft nur bei Netzwerkproblemen oder Zeitüberschreitung, nicht bei Fehlerstatus wie 404
    throw new BffFehler(0, "BFF nicht erreichbar");
  }

  // Die Antwort darf ohne gültiges JSON kommen (z. B. bei einem Serverabsturz)
  const inhalt = await antwort.json().catch(() => ({}));

  // fetch wirft bei 4xx/5xx nicht von selbst, deshalb wird hier geprüft
  if (!antwort.ok) {
    throw new BffFehler(antwort.status, inhalt.message ?? "");
  }
  return inhalt;
}

// Statusabfrage: Ist das BFF erreichbar?
function holeStatus() {
  return anfrage("/status");
}

module.exports = { anfrage, holeStatus, BffFehler };