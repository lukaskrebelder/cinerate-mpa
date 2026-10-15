// Startet den Server der MPA (die App selbst wird in app.js gebaut).
require("dotenv").config();
const { createApp } = require("./app"); //--> Lädt createApp aus /app
const bff = require("./lib/bff");       //--> importiert die Backend Logik

const PORT = process.env.PORT || 5000;  //--> Definiert den Server-Port

//--> Startet den Server
createApp({ bff }).listen(PORT, () => {
  console.log(`CineRate-MPA läuft auf http://localhost:${PORT}`);
});