// Baut die Express-App der MPA --> Der Server wird in server.js gestartet.
// Die App ist von server.js getrennt, damit die Tests sie ohne festen Port starten können.
const path = require("path");
const express = require("express");
const { erstelleSeitenRouter } = require("./routes/seiten");

// Menüpunkte im Header. Weitere (Anmelden, Registrieren, etc.) kommen mit den jeweiligen Seiten dazu.
const MENUE = [{ text: "Start", pfad: "/" }];

function createApp({ bff }) {
  const app = express();

  app.disable("x-powered-by");           // verrät nicht, dass der Server mit Express läuft
  app.set("view engine", "ejs");         // Vorlagen sind .ejs-Dateien im Ordner views/
  app.set("views", path.join(__dirname, "views"));

  // Stylesheet und weitere Dateien aus public/ werden direkt ausgeliefert
  app.use(express.static(path.join(__dirname, "public")));

  // Diese Werte stehen in allen Vorlagen zur Verfügung (Menü und aktuelle Adresse für die Markierung)
  app.use((req, res, next) => {
    res.locals.menue = MENUE;
    res.locals.aktuellerPfad = req.path;
    next();
  });

  app.use(erstelleSeitenRouter({ bff }));

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