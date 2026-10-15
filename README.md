Erstellt mit CLaude Sonett 5.5 (Erstelle mir ein README für den REPO cinerate-mpa)

# cinerate-mpa

Multi Page Application (MPA) von CineRate. 

## Architektur

Die MPA ist ein Express-Server, der pro Seite fertiges HTML aus Vorlagen (EJS) erzeugt. Der Browser lädt bei jedem Klick eine neue Seite vom Server. Damit ist sie das zweite Touchpoint neben der SPA ([cinerate-spa](../cinerate-spa)).

Die MPA spricht **ausschließlich mit dem BFF** ([cinerate-bff](../cinerate-bff)), nie direkt mit dem Backend oder der TMDB-API. Die Aufrufe laufen über `lib/bff.js`. Weil das BFF vom Server aus aufgerufen wird und nicht vom Browser, ist keine CORS-Freigabe nötig.

## Setup

npm install
cp .env.example .env
npm start

Läuft auf [http://localhost:5000](http://localhost:5000). Die Startseite funktioniert auch ohne laufendes BFF. `/status` zeigt, ob das BFF erreichbar ist.

Tests: `npm test`

## Umgebungsvariablen

| Variable | Bedeutung |
|---|---|
| `PORT` | Port des Servers (Heroku setzt ihn selbst) |
| `BFF_URL` | Adresse des BFF |

## Deployment auf Heroku

Die Heroku-App `cinerate-mpa` braucht die Config Var `BFF_URL`, die auf die URL der BFF-App zeigt. Gestartet wird sie über das `Procfile`.

## Tech-Stack

Node.js, Express, EJS