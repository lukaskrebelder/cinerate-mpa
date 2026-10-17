// Baut die Express-App der MPA --> Der Server wird in server.js gestartet.
// Die App ist von server.js getrennt, damit die Tests sie ohne festen Port starten können.
const path = require("path");
const express = require("express");

const cookieParser = require("cookie-parser");
const { erstelleSeitenRouter } = require("./routes/seiten");
const { erstelleAuthRouter } = require("./routes/auth");
const { holeToken } = require("./lib/sitzung");
const { bestimmeMenuepunkte } = require("./lib/navigation");

function createApp({ bff }) {
  const app = express();

  app.disable("x-powered-by");           // verrät nicht, dass der Server mit Express läuft
  app.set("view engine", "ejs");         // Vorlagen sind .ejs-Dateien im Ordner views/
  app.set("views", path.join(__dirname, "views"));

  // Stylesheet und weitere Dateien aus public/ werden direkt ausgeliefert
  app.use(express.static(path.join(__dirname, "public")));

  // Formulareingaben (POST) lesen und die Cookies der Anfrage verfügbar machen
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  // Token aus dem Cookie lesen. Diese Werte stehen in allen Vorlagen zur Verfügung
  // (Menü je nach Anmeldestatus und aktuelle Adresse für die Markierung).
  app.use((req, res, next) => {
    req.token = holeToken(req);
    res.locals.menue = bestimmeMenuepunkte(req.token !== null);
    res.locals.aktuellerPfad = req.path;
    next();
  });

  app.use(erstelleSeitenRouter({ bff }));
  app.use(erstelleAuthRouter({ bff }));

  // Keine Route passt: 404-Seite
  app.use((req, res) => {
    res.status(404).render("fehler", {
      titel: "Seite nicht gefunden",
      ueberschrift: "Seite nicht gefunden",
      text: "Diese Seite gibt es nicht.",
    });
  });

  // Unerwarteter Fehler in einer Route: 500-Seite (Express erkennt Fehlerbehandlung an den vier Parametern)
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).render("fehler", {
      titel: "Fehler",
      ueberschrift: "Etwas ist schiefgelaufen",
      text: "Bitte versuche es später noch einmal.",
    });
  });

  return app;
}

module.exports = { createApp };