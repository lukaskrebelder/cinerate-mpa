// KI-Log B42: Erstellt mithilfe von KI (Claude Sonnett 5.5) – Kommunikation der MPA mit dem BFF
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

// Die Abfrage für die Filmsuche (GraphQL). Variablen, die nicht gesetzt sind, werden weggelassen.
const SUCHE = `query Suche($query: String, $genre: String, $page: Int) {
  filme(query: $query, genre: $genre, page: $page) {
    page
    totalPages
    movies { movieId title posterUrl }
  }
}`;

// Das BFF meldet Fehler bei GraphQL nur als Text ohne Statuscode. Der Text kommt vom Backend
// --> daher wird hier der Statuscode daraus abgeleitet, damit die MPA wie bei REST reagieren kann.
function statusAusGraphqlFehler(meldung) {
  if (meldung === "Invalid token.") return 401;
  if (meldung === "Invalid filter value.") return 400;
  if (typeof meldung === "string" && (meldung.includes("not reachable") || meldung.includes("unavailable"))) {
    return 503;
  }
  return 500;
}

// GraphQL-Abfrage an das BFF (POST /bff/graphql). 
// --> Ein Fehler steht in der Antwort im Feld "errors", auch wenn der HTTP-Status 200 ist. Dann wird ein BffFehler mit abgeleitetem Statuscode geworfen.
async function graphql(abfrage, variablen, { token } = {}) {
  const inhalt = await anfrage("/graphql", { methode: "POST", daten: { query: abfrage, variables: variablen }, token });
  if (Array.isArray(inhalt.errors) && inhalt.errors.length > 0) {
    const meldung = inhalt.errors[0].message;
    throw new BffFehler(statusAusGraphqlFehler(meldung), meldung ?? "");
  }
  return inhalt.data;
}

// Filmsuche über GraphQL. 
async function sucheFilme({ query, genre, page } = {}, token) {
  const variablen = {};
  if (query) variablen.query = query;
  if (genre) variablen.genre = genre;
  if (page) variablen.page = page;

  const daten = await graphql(SUCHE, variablen, { token });
  if (!daten || !daten.filme || !Array.isArray(daten.filme.movies)) {
    throw new BffFehler(502, "Ungültige Antwort des BFF");
  }
  return daten.filme;
}

module.exports = { anfrage, holeStatus, graphql, sucheFilme, statusAusGraphqlFehler, BffFehler };