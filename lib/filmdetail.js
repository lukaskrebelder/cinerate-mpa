// KI-Log B56: Erstellt mithilfe von KI (Claude Sonnett 5.5) – Hilfsfunktionen der Filmdetailseite

// Hier befinden sich alle nötigen Hilfsfunktionen für die Detailseite eines Films in der MPA

// Größte Zahl, die GraphQL als Int annimmt. Alles darüber kann kein Film sein und wird gar nicht erst gefragt.
const MAX_FILM_ID = 2147483647;

// Die ID kommt aus der Adresse und ist damit Text. Gültig ist nur eine ganze Zahl ab 1 (die TMDB-ID).
function istGueltigeFilmId(id) {
  return typeof id === "string" && /^\d+$/.test(id) && Number(id) >= 1 && Number(id) <= MAX_FILM_ID;
}

// Laufzeit in Minuten als Text, zB. 169 --> "2 h 49 min"
function formatiereLaufzeit(minuten) {
  if (!Number.isInteger(minuten) || minuten <= 0) return "Keine Angabe";
  const stunden = Math.floor(minuten / 60);
  const rest = minuten % 60;
  if (stunden === 0) return `${rest} min`;
  return rest === 0 ? `${stunden} h` : `${stunden} h ${rest} min`;
}

// Altersfreigabe als Text, zB. 12 --> "FSK 12". Ohne Angabe (null) steht dort "Keine Angabe".
function formatiereFsk(fsk) {
  return [0, 6, 12, 16, 18].includes(fsk) ? `FSK ${fsk}` : "Keine Angabe";
}

// Durchschnittliche Bewertung als Text mit Komma, zB. 4.3 --> "4,3 von 5"
function formatiereDurchschnitt(durchschnitt) {
  if (typeof durchschnitt !== "number" || !Number.isFinite(durchschnitt)) return "Noch keine Bewertungen";
  return `${durchschnitt.toFixed(1).replace(".", ",")} von 5`;
}

// Die Eckdaten, die unter dem Titel stehen, als Paare aus Bezeichnung und Wert.
function bestimmeDetails(film) {
  return [
    { bezeichnung: "Erscheinungsjahr", wert: Number.isInteger(film.releaseYear) ? String(film.releaseYear) : "Keine Angabe" },
    { bezeichnung: "Laufzeit", wert: formatiereLaufzeit(film.runtime) },
    { bezeichnung: "Altersfreigabe", wert: formatiereFsk(film.fsk) },
    { bezeichnung: "Durchschnittliche Bewertung", wert: formatiereDurchschnitt(film.avgRating) },
  ];
}

// Adresse der Detailseite, zB. /film/157336?query=Matrix&page=2
// Die Eingaben der Suche werden mitgegeben, damit der Link "Zurück zur Filmsuche" wieder dort landet.
// Nur ausgefüllte Felder kommen hinein, Seite 1 wird weggelassen. Bei einer ungültigen ID gibt es keine Adresse (null).
function baueFilmPfad(movieId, { query, genre, page } = {}) {
  if (!Number.isInteger(movieId) || movieId < 1) return null;
  const parameter = new URLSearchParams();
  if (typeof query === "string" && query !== "") parameter.set("query", query);
  if (typeof genre === "string" && genre !== "") parameter.set("genre", genre);
  if (Number.isInteger(page) && page > 1) parameter.set("page", String(page));
  const text = parameter.toString();
  return text === "" ? `/film/${movieId}` : `/film/${movieId}?${text}`;
}

// Übersetzt den Statuscode einer Fehlerantwort in einen deutschen Text für den Nutzer.
// 401 (Sitzung abgelaufen) gehört nicht dazu: Dann geht es zurück zur Anmeldung.
function uebersetzeDetailfehler(status) {
  if (status === 404) return "Diesen Film gibt es nicht.";
  if (status === 0 || status === 502 || status === 503) {
    return "Der Server ist gerade nicht erreichbar. Bitte versuche es später noch einmal.";
  }
  return "Der Film konnte nicht geladen werden. Bitte versuche es später noch einmal.";
}

module.exports = {
  MAX_FILM_ID,
  istGueltigeFilmId,
  formatiereLaufzeit,
  formatiereFsk,
  formatiereDurchschnitt,
  bestimmeDetails,
  baueFilmPfad,
  uebersetzeDetailfehler,
};