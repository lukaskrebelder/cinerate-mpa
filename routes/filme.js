// Filmsuche der MPA: GET /filme mit Titel, Genre und Seite in der Adresse.
// Die Daten kommen über GraphQL vom BFF. 
// --> Die Seite ist nur für angemeldete Nutzer.

const express = require("express");
const { GENRES } = require("../lib/genres");
const { loescheToken } = require("../lib/sitzung");
const {
  leseSeite,
  leseText,
  istSichereBildUrl,
  baueSuchpfad,
  bestimmeSeitenanzeige,
  uebersetzeSuchfehler,
} = require("../lib/filme");

// Statuscode für die Antwortseite, wenn das BFF einen Fehler meldet.
// Status 0 heißt: Das BFF hat gar nicht geantwortet.
function statusFuerFehler(fehler) {
  return fehler.status > 0 ? fehler.status : 503;
}

function erstelleFilmeRouter({ bff }) {
  const router = express.Router();

  // suche: die Eingaben, "ergebnis": die Treffer des BFF
  function zeigeFilme(res, status, { suche, ergebnis = null, fehler = null }) {
    const anzeige = ergebnis ? bestimmeSeitenanzeige(ergebnis.page, ergebnis.totalPages) : null;
    res.status(status).render("filme", {
      titel: "Filme",
      suche,
      ergebnis,
      fehler,
      genres: GENRES,
      istSichereBildUrl,
      anzeige,
      zurueckPfad: ergebnis ? baueSuchpfad({ ...suche, page: ergebnis.page - 1 }) : null,
      weiterPfad: ergebnis ? baueSuchpfad({ ...suche, page: ergebnis.page + 1 }) : null,
    });
  }

  router.get("/filme", async (req, res) => {
    // Ohne Anmeldung geht es zur Anmeldeseite, dort erklärt ein Hinweis, warum
    if (req.token === null) return res.redirect(303, "/anmelden?hinweis=anmeldung");

    const suche = { query: leseText(req.query.query), genre: leseText(req.query.genre), page: leseSeite(req.query.page) };

    try {
      const ergebnis = await bff.sucheFilme(suche, req.token);
      zeigeFilme(res, 200, { suche, ergebnis });
    } catch (err) {
      // Das BFF lehnt das Token ab: Die Sitzung ist abgelaufen. Cookie löschen und neu anmelden lassen.
      if (err.status === 401) {
        loescheToken(res);
        return res.redirect(303, "/anmelden?hinweis=abgelaufen");
      }
      zeigeFilme(res, statusFuerFehler(err), { suche, fehler: uebersetzeSuchfehler(err.status ?? 0) });
    }
  });

  return router;
}

module.exports = { erstelleFilmeRouter };