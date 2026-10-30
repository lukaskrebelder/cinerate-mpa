// Seiten der MPA. Jede Route erzeugt eine fertige HTML-Seite aus einer Vorlage in views/.
const express = require("express");

// Das BFF wird übergeben, damit die Tests ein eigenes BFF benutzen können.
function erstelleSeitenRouter({ bff }) {
  const router = express.Router();

  router.get("/", (req, res) => {
    res.render("startseite", { titel: "Startseite" });
  });

  // Statusroute: prüft, ob die MPA läuft und auch das BFF antwortet
  router.get("/status", async (req, res) => {
    try {
      const bffStatus = await bff.holeStatus();
      res.json({ status: "ok", nachricht: "CineRate-MPA läuft", bff: bffStatus });
    } catch (err) {
      // Entweder Status 0 oder keiner: Das BFF hat gar nicht geantwortet. Sonst: Es hat mit einem Fehlerstatus geantwortet.
      const nachricht = err.status
        ? `BFF antwortet mit Status ${err.status}`
        : "BFF nicht erreichbar";
      res.status(502).json({ status: "error", nachricht });
    }
  });

  return router;
}

module.exports = { erstelleSeitenRouter };