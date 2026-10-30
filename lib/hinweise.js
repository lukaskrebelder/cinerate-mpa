// Hinweise, die auf der Anmeldeseite erscheinen, wenn man dorthin umgeleitet wurde.
const HINWEISE = {
  anmeldung: "Bitte melde dich an, um diese Seite zu sehen.",
  abgelaufen: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.",
};

// Liefert den Text zu einem Stichwort oder null, wenn es das Stichwort nicht gibt.
function findeHinweis(stichwort) {
  if (typeof stichwort !== "string") return null;
  return Object.hasOwn(HINWEISE, stichwort) ? HINWEISE[stichwort] : null;
}

module.exports = { HINWEISE, findeHinweis };