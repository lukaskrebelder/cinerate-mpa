// Funktionen zT. mithilfe von KI (Claude Sonett 5.5) gebaut

// Hier befinden sich alle nötigen Hilfsfunktionen für die Filmsuche der MPA
// --> reine Funktionen, damit sie sich ohne Server testen lassen.

const MAX_TEXT_LAENGE = 200;

// Liest die Seitennummer aus der Adresse. Alles, was keine ganze Zahl ab 1 ist, ergibt Seite 1.
function leseSeite(wert) {
  if (typeof wert !== "string" || !/^\d+$/.test(wert)) return 1;
  const zahl = Number(wert);
  return zahl >= 1 ? zahl : 1;
}

// Liest einen Suchtext aus der Adresse: Text ohne Leerzeichen am Rand, höchstens 200 Zeichen.
// Fehlende oder doppelte Angaben ergeben einen leeren Text.
function leseText(wert) {
  if (typeof wert !== "string") return "";
  return wert.trim().slice(0, MAX_TEXT_LAENGE);
}

// Bilder kommen von TMDB. Nur Adressen von dort werden angezeigt, alles andere bekommt den Platzhalter.
function istSichereBildUrl(url) {
  return typeof url === "string" && url.startsWith("https://image.tmdb.org/");
}

// Adresse einer Seite der Trefferliste, zB. /filme?query=Matrix&genre=Action&page=2
// Nur ausgefüllte Felder kommen hinein, Seite 1 wird weggelassen.
function baueSuchpfad({ query, genre, page } = {}) {
  const parameter = new URLSearchParams();
  if (typeof query === "string" && query !== "") parameter.set("query", query);
  if (typeof genre === "string" && genre !== "") parameter.set("genre", genre);
  if (Number.isInteger(page) && page > 1) parameter.set("page", String(page));
  const text = parameter.toString();
  return text === "" ? "/filme" : `/filme?${text}`;
}

// Text und Zustand der Knöpfe unter der Trefferliste, zB. "Seite 2 von 5"
function bestimmeSeitenanzeige(seite, gesamtSeiten) {
  const gesamt = Number.isInteger(gesamtSeiten) && gesamtSeiten >= 1 ? gesamtSeiten : 1;
  return {
    text: `Seite ${seite} von ${gesamt}`,
    hatZurueck: seite > 1,
    hatWeiter: seite < gesamt,
  };
}

// Übersetzt den Statuscode einer Fehlerantwort in einen deutschen Text für den Nutzer.
// 401 (Sitzung abgelaufen) gehört nicht dazu: Dann geht es zurück zur Anmeldung.
function uebersetzeSuchfehler(status) {
  if (status === 400) return "Bitte prüfe deine Eingaben.";
  if (status === 0 || status === 502 || status === 503) {
    return "Der Server ist gerade nicht erreichbar. Bitte versuche es später noch einmal.";
  }
  return "Die Suche ist fehlgeschlagen. Bitte versuche es später noch einmal.";
}

module.exports = {
  leseSeite,
  leseText,
  istSichereBildUrl,
  baueSuchpfad,
  bestimmeSeitenanzeige,
  uebersetzeSuchfehler,
};