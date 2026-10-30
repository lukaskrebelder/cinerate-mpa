// Genres für die Auswahl in der Filmsuche
// Die Namen müssen genau so geschrieben sein, wie TMDB sie auf Deutsch gibt, 
// denn das Backend vergleicht den Namen mit der Genre-Liste von TMDB. 
// --> Ein unbekannter Name führt dort zu Fehler 400.
// --> Die Liste ist dieselbe wie in der SPA (= js/genres.js).
const GENRES = [
  "Abenteuer",
  "Action",
  "Animation",
  "Dokumentarfilm",
  "Drama",
  "Familie",
  "Fantasy",
  "Historie",
  "Horror",
  "Komödie",
  "Krimi",
  "Kriegsfilm",
  "Liebesfilm",
  "Musik",
  "Mystery",
  "Science Fiction",
  "Thriller",
  "TV-Film",
  "Western",
];

module.exports = { GENRES };