// Registrierung, Anmeldung und Abmeldung in der MPA.
// Ablauf bei den Formularen: Eingaben prüfen -> an das BFF senden -> Seite mit Ergebnis anzeigen.
// Nach einer erfolgreichen Anmeldung oder Abmeldung folgt ein Redirect auf die Startseite.
// So löst ein Neuladen der Seite das Formular nicht noch einmal aus.
// KI-Log B44: Erstellt mithilfe von KI (Claude Sonnett 5.5) – Routen für Registrierung, Anmeldung und Abmeldung
// --> Prinzip ähnlich wie im Backend, daher mithilfe von KI geschrieben
const express = require("express");
const { findeRegistrierungsfehler, findeAnmeldefehler } = require("../lib/validierung");
const { uebersetzeRegistrierungsfehler, uebersetzeAnmeldefehler } = require("../lib/fehlertexte");
const { speichereToken, loescheToken } = require("../lib/sitzung");
const { findeHinweis } = require("../lib/hinweise");

// Aus einem Formularfeld wird immer ein Text (bei fehlenden oder doppelten Feldern ein leerer)
function text(wert) {
  return typeof wert === "string" ? wert : "";
}

// Statuscode für die Antwortseite, wenn das BFF einen Fehler meldet.
// Status 0 heißt: Das BFF hat gar nicht geantwortet.
function statusFuerFehler(fehler) {
  return fehler.status > 0 ? fehler.status : 503;
}

function erstelleAuthRouter({ bff }) {
  const router = express.Router();

  // Wer schon angemeldet ist, braucht weder Anmeldung noch Registrierung
  function nurGaeste(req, res, next) {
    if (req.token !== null) return res.redirect(303, "/");
    next();
  }

  // --> Registrierung

  // werte: Eingaben, die nach einem Fehler wieder im Formular stehen (nie das Passwort)
  function zeigeRegistrierung(res, status, { fehler = null, werte = {}, erfolg = false } = {}) {
    res.status(status).render("registrieren", { titel: "Registrieren", fehler, werte, erfolg });
  }

  router.get("/registrieren", nurGaeste, (req, res) => {
    zeigeRegistrierung(res, 200);
  });

  router.post("/registrieren", nurGaeste, async (req, res) => {
    const eingabe = req.body ?? {};
    const daten = {
      firstName: text(eingabe.firstName),
      lastName: text(eingabe.lastName),
      email: text(eingabe.email),
      password: text(eingabe.password),
    };
    const werte = { firstName: daten.firstName, lastName: daten.lastName, email: daten.email };

    const fehler = findeRegistrierungsfehler(daten);
    if (fehler.length > 0) {
      return zeigeRegistrierung(res, 400, { fehler: fehler.join(" "), werte });
    }

    try {
      await bff.anfrage("/users", { methode: "POST", daten });
      zeigeRegistrierung(res, 201, { erfolg: true });
    } catch (err) {
      zeigeRegistrierung(res, statusFuerFehler(err), {
        fehler: uebersetzeRegistrierungsfehler(err.status ?? 0),
        werte,
      });
    }
  });

  // --> Anmeldung

  function zeigeAnmeldung(res, status, { fehler = null, email = "", hinweis = null } = {}) {
    res.status(status).render("anmelden", { titel: "Anmelden", fehler, email, hinweis });
  }

  // hinweis=abgelaufen oder hinweis=anmeldung: Nach einer Umleitung erklärt ein Hinweis, warum man hier ist
  router.get("/anmelden", nurGaeste, (req, res) => {
    zeigeAnmeldung(res, 200, { hinweis: findeHinweis(req.query.hinweis) });
  });

  router.post("/anmelden", nurGaeste, async (req, res) => {
    const eingabe = req.body ?? {};
    const daten = { email: text(eingabe.email), password: text(eingabe.password) };

    const fehler = findeAnmeldefehler(daten);
    if (fehler.length > 0) {
      return zeigeAnmeldung(res, 400, { fehler: fehler.join(" "), email: daten.email });
    }

    try {
      const antwort = await bff.anfrage("/auth", { methode: "POST", daten });
      if (typeof antwort.token !== "string" || antwort.token === "") {
        // Das BFF hat Erfolg gemeldet, aber kein Token mitgeschickt
        return zeigeAnmeldung(res, 502, { fehler: uebersetzeAnmeldefehler(502), email: daten.email });
      }
      speichereToken(res, antwort.token);   // das Token ist ab jetzt der "Ausweis" für geschützte Aufrufe
      res.redirect(303, "/");
    } catch (err) {
      zeigeAnmeldung(res, statusFuerFehler(err), {
        fehler: uebersetzeAnmeldefehler(err.status ?? 0),
        email: daten.email,
      });
    }
  });

  // --> Abmeldung 

  router.post("/abmelden", async (req, res) => {
    // Zuerst die Sitzung im Backend beenden. Das Token geht dabei im Header mit.
    // Ist das BFF nicht erreichbar, wird trotzdem abgemeldet.
    if (req.token !== null) {
      try {
        await bff.anfrage("/auth", { methode: "DELETE", token: req.token });
      } catch {
        // bewusst leer: Hier wird in jedem Fall abgemeldet
      }
    }
    loescheToken(res);
    res.redirect(303, "/");
  });

  return router;
}

module.exports = { erstelleAuthRouter };