// Übersetzt den Statuscode einer Fehlerantwort des BFF in einen deutschen lesbaren Text für den Nutzer.
// Die Texte des Servers sind englisch, deshalb wird nach dem Statuscode entschieden.

const SERVER_NICHT_ERREICHBAR = "Der Server ist gerade nicht erreichbar. Bitte versuche es später noch einmal.";

function uebersetzeRegistrierungsfehler(status) {
  if (status === 400) return "Bitte prüfe deine Eingaben.";
  if (status === 409) return "Mit dieser E-Mail-Adresse gibt es bereits ein Konto.";
  if (status === 0 || status === 502 || status === 503) return SERVER_NICHT_ERREICHBAR;
  return "Die Registrierung ist fehlgeschlagen. Bitte versuche es später noch einmal.";
}

// Bei 401 steht absichtlich nicht, ob die E-Mail oder das Passwort falsch war.
function uebersetzeAnmeldefehler(status) {
  if (status === 400) return "Bitte gib E-Mail-Adresse und Passwort ein.";
  if (status === 401) return "E-Mail-Adresse oder Passwort ist falsch.";
  if (status === 0 || status === 502 || status === 503) return SERVER_NICHT_ERREICHBAR;
  return "Die Anmeldung ist fehlgeschlagen. Bitte versuche es später noch einmal.";
}

module.exports = { uebersetzeRegistrierungsfehler, uebersetzeAnmeldefehler };