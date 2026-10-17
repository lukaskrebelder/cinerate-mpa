//Code mithilfe von CLAUDE Sonnett 5.5

// Das Token ( = "Ausweis" nach der Anmeldung) liegt bei der MPA in einem Cookie.
// Der Browser schickt es bei jeder Anfrage automatisch mit, die MPA gibt es als
// "Authorization: Bearer <token>" an das BFF weiter. Die MPA selbst speichert nichts!

const COOKIE_NAME = "cinerate_token";

// So lange gilt das Token im Backend (24 Stunden). Das Cookie läuft zur gleichen Zeit ab.
const GUELTIGKEIT_MS = 24 * 60 * 60 * 1000;

// Eigenschaften des Cookies:
// httpOnly: JavaScript im Browser kommt nicht an das Token (Schutz vor Diebstahl durch Schadcode)
// secure: wird nur über HTTPS gesendet. Lokal (http://localhost) ist das aus, auf Heroku an.
// sameSite "lax": Bei Anfragen von fremden Seiten wird das Cookie nur bei normalen Links mitgeschickt
function cookieOptionen() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };
}

// Liest das Token aus dem Cookie der Anfrage. Gibt null zurück, wenn keines da ist.
function holeToken(req) {
  const token = req.cookies?.[COOKIE_NAME];
  return typeof token === "string" && token !== "" ? token : null;
}

function speichereToken(res, token) {
  res.cookie(COOKIE_NAME, token, { ...cookieOptionen(), maxAge: GUELTIGKEIT_MS });
}

function loescheToken(res) {
  res.clearCookie(COOKIE_NAME, cookieOptionen());
}

module.exports = { COOKIE_NAME, holeToken, speichereToken, loescheToken };