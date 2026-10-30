// Prüfregeln für Registrierung und Anmeldung auf dem Server der MPA.
// Es sind reine Funktionen, damit sie sich einfach testen lassen.
// Die Regeln entsprechen absichtlich denen in der SPA und im Backend (lib/validation.js).
// --> Daher nahezu copy paste aus SPA oder Backend
// Die Prüfungen im Backend bleiben die maßgeblichen, die hier sparen nur unnötige Aufrufe ans BFF.

// Text ohne Leerzeichen am Anfang und Ende, in Kleinbuchstaben
function normalizeEmail(email) {
  if (typeof email !== "string") return "";
  return email.trim().toLowerCase();
}

// Kein Leerzeichen, genau ein @, danach Text, ein Punkt und wieder Text
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
  return typeof email === "string" && EMAIL_PATTERN.test(email);
}

// Mindestens 8 Zeichen. Leerzeichen zählen mit (das Passwort wird nicht getrimmt)
function isValidPassword(password) {
  return typeof password === "string" && password.length >= 8;
}

// Text, der nicht leer ist und nicht nur aus Leerzeichen besteht
function isNonEmptyText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

// Sammelt alle Fehler eines Registrierungsformulars als verständliche Texte.
// Ist die Liste leer, ist die Eingabe in Ordnung.
function findeRegistrierungsfehler(daten) {
  const fehler = [];
  if (!isNonEmptyText(daten?.firstName)) fehler.push("Bitte gib deinen Vornamen ein.");
  if (!isNonEmptyText(daten?.lastName)) fehler.push("Bitte gib deinen Nachnamen ein.");
  if (!isValidEmail(normalizeEmail(daten?.email))) fehler.push("Bitte gib eine gültige E-Mail-Adresse ein.");
  if (!isValidPassword(daten?.password)) fehler.push("Das Passwort muss mindestens 8 Zeichen lang sein.");
  return fehler;
}

// Sammelt die Fehler eines Anmeldeformulars als verständliche Texte.
// Hier wird nur geprüft, ob beide Felder ausgefüllt sind. Ob E-Mail und Passwort stimmen,
// entscheidet das Backend (mit derselben Meldung für beide Fälle).
function findeAnmeldefehler(daten) {
  const fehler = [];
  if (!isNonEmptyText(daten?.email)) fehler.push("Bitte gib deine E-Mail-Adresse ein.");
  if (!isNonEmptyText(daten?.password)) fehler.push("Bitte gib dein Passwort ein.");
  return fehler;
}

module.exports = {
  normalizeEmail,
  isValidEmail,
  isValidPassword,
  isNonEmptyText,
  findeRegistrierungsfehler,
  findeAnmeldefehler,
};