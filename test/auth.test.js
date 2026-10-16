// Tests für Registrierung, Anmeldung und Abmeldung der MPA (US-2).
// Die App läuft auf einem freien Port, das BFF wird durch ein gefälschtes ersetzt,
// das jeden Aufruf merkt. So sieht man, was die MPA ans BFF geschickt hat.
const test = require("node:test");
const assert = require("node:assert");
const { createApp } = require("../app");
const { BffFehler } = require("../lib/bff");

// Gefälschtes BFF. antwort(pfad, optionen) liefert das Ergebnis oder wirft einen Fehler.
function erstelleBff(antwort) {
  const aufrufe = [];
  return {
    aufrufe,
    holeStatus: async () => ({ status: "ok" }),
    anfrage: async (pfad, optionen = {}) => {
      aufrufe.push({ pfad, ...optionen });
      return antwort(pfad, optionen);
    },
  };
}

async function mitServer(bff, pruefung) {
  const server = createApp({ bff }).listen(0);
  await new Promise((fertig) => server.once("listening", fertig));
  try {
    await pruefung(`http://localhost:${server.address().port}`);
  } finally {
    await new Promise((fertig) => server.close(fertig));
  }
}

// Schickt ein Formular, wie der Browser es tut. Weiterleitungen werden nicht verfolgt,
// damit der Test sie selbst prüfen kann.
function sendeFormular(basis, pfad, felder, cookie) {
  const kopfzeilen = { "Content-Type": "application/x-www-form-urlencoded" };
  if (cookie) kopfzeilen.Cookie = cookie;
  return fetch(`${basis}${pfad}`, {
    method: "POST",
    headers: kopfzeilen,
    body: new URLSearchParams(felder).toString(),
    redirect: "manual",
  });
}

function setCookies(antwort) {
  return antwort.headers.getSetCookie();
}

const gueltigeRegistrierung = {
  firstName: "Max",
  lastName: "Muster",
  email: "max@example.com",
  password: "geheim123",
};

// --> Seiten

test("Die Seiten Anmelden und Registrieren zeigen ein Formular", async () => {
  await mitServer(erstelleBff(() => ({})), async (basis) => {
    const anmelden = await (await fetch(`${basis}/anmelden`)).text();
    assert.ok(anmelden.includes('<form class="formular" method="post" action="/anmelden"'));
    const registrieren = await (await fetch(`${basis}/registrieren`)).text();
    assert.ok(registrieren.includes('<form class="formular" method="post" action="/registrieren"'));
  });
});

test("Gäste sehen im Menü Anmelden und Registrieren, aber kein Abmelden", async () => {
  await mitServer(erstelleBff(() => ({})), async (basis) => {
    const html = await (await fetch(`${basis}/`)).text();
    assert.ok(html.includes(">Anmelden</a>"));
    assert.ok(html.includes(">Registrieren</a>"));
    assert.ok(!html.includes("Abmelden"));
  });
});

test("Mit Cookie sieht man im Menü Abmelden statt Anmelden und Registrieren", async () => {
  await mitServer(erstelleBff(() => ({})), async (basis) => {
    const html = await (await fetch(`${basis}/`, { headers: { Cookie: "cinerate_token=abc" } })).text();
    assert.ok(html.includes('<form class="menue-form" method="post" action="/abmelden">'));
    assert.ok(!html.includes(">Anmelden</a>"));
    assert.ok(!html.includes(">Registrieren</a>"));
  });
});

test("Wer angemeldet ist, wird von Anmelden und Registrieren auf die Startseite geleitet", async () => {
  await mitServer(erstelleBff(() => ({})), async (basis) => {
    for (const pfad of ["/anmelden", "/registrieren"]) {
      const antwort = await fetch(`${basis}${pfad}`, {
        headers: { Cookie: "cinerate_token=abc" },
        redirect: "manual",
      });
      assert.strictEqual(antwort.status, 303);
      assert.strictEqual(antwort.headers.get("location"), "/");
    }
  });
});

// --> Registrierung 

test("Registrierung: Gültige Eingaben gehen als POST /users ans BFF und zeigen die Bestätigung", async () => {
  const bff = erstelleBff(() => ({ message: "Account has been created.", userId: "u_1" }));
  await mitServer(bff, async (basis) => {
    const antwort = await sendeFormular(basis, "/registrieren", gueltigeRegistrierung);
    const html = await antwort.text();
    assert.strictEqual(antwort.status, 201);
    assert.ok(html.includes("Konto erstellt"));
    assert.strictEqual(bff.aufrufe.length, 1);
    assert.strictEqual(bff.aufrufe[0].pfad, "/users");
    assert.strictEqual(bff.aufrufe[0].methode, "POST");
    assert.deepStrictEqual(bff.aufrufe[0].daten, gueltigeRegistrierung);
  });
});

test("Registrierung: Ungültige Eingaben zeigen Fehler, behalten die Eingaben und rufen das BFF nicht auf", async () => {
  const bff = erstelleBff(() => ({}));
  await mitServer(bff, async (basis) => {
    const antwort = await sendeFormular(basis, "/registrieren", {
      firstName: "Max",
      lastName: "",
      email: "kaputt",
      password: "geheim123",
    });
    const html = await antwort.text();
    assert.strictEqual(antwort.status, 400);
    assert.ok(html.includes("Bitte gib deinen Nachnamen ein."));
    assert.ok(html.includes("Bitte gib eine gültige E-Mail-Adresse ein."));
    assert.ok(html.includes('value="Max"'));
    assert.ok(!html.includes("geheim123"));     // das Passwort steht nie wieder im Formular
    assert.strictEqual(bff.aufrufe.length, 0);
  });
});

test("Registrierung: Gibt es die E-Mail schon (409), erscheint die deutsche Meldung", async () => {
  const bff = erstelleBff(() => {
    throw new BffFehler(409, "Email already exists.");
  });
  await mitServer(bff, async (basis) => {
    const antwort = await sendeFormular(basis, "/registrieren", gueltigeRegistrierung);
    const html = await antwort.text();
    assert.strictEqual(antwort.status, 409);
    assert.ok(html.includes("Mit dieser E-Mail-Adresse gibt es bereits ein Konto."));
    assert.ok(html.includes('value="max@example.com"'));
    assert.ok(!html.includes("geheim123"));
  });
});

test("Registrierung: Ist das BFF nicht erreichbar, erscheint eine verständliche Meldung (503)", async () => {
  const bff = erstelleBff(() => {
    throw new BffFehler(0, "BFF nicht erreichbar");
  });
  await mitServer(bff, async (basis) => {
    const antwort = await sendeFormular(basis, "/registrieren", gueltigeRegistrierung);
    const html = await antwort.text();
    assert.strictEqual(antwort.status, 503);
    assert.ok(html.includes("Der Server ist gerade nicht erreichbar."));
  });
});

test("Eingaben werden beim Anzeigen maskiert (kein Schadcode im Formular)", async () => {
  const bff = erstelleBff(() => ({}));
  await mitServer(bff, async (basis) => {
    const antwort = await sendeFormular(basis, "/anmelden", {
      email: '"><script>alert(1)</script>',
      password: "",
    });
    const html = await antwort.text();
    assert.ok(!html.includes("<script>alert(1)</script>"));
    assert.ok(html.includes("&lt;script&gt;"));
  });
});

// --> Anmeldung 

test("Anmeldung: Bei Erfolg wird das Token im Cookie gespeichert und zur Startseite weitergeleitet", async () => {
  const bff = erstelleBff(() => ({ token: "tok_abc" }));
  await mitServer(bff, async (basis) => {
    const antwort = await sendeFormular(basis, "/anmelden", { email: "max@example.com", password: "geheim123" });
    assert.strictEqual(antwort.status, 303);
    assert.strictEqual(antwort.headers.get("location"), "/");
    assert.strictEqual(bff.aufrufe[0].pfad, "/auth");
    assert.strictEqual(bff.aufrufe[0].methode, "POST");
    assert.deepStrictEqual(bff.aufrufe[0].daten, { email: "max@example.com", password: "geheim123" });

    const cookie = setCookies(antwort)[0];
    assert.ok(cookie.startsWith("cinerate_token=tok_abc"));
    assert.ok(cookie.includes("HttpOnly"));
    assert.ok(cookie.includes("SameSite=Lax"));
    assert.ok(cookie.includes("Max-Age=86400"));
    assert.ok(cookie.includes("Path=/"));
  });
});

test("Anmeldung: Das Cookie ist in der Produktion zusätzlich Secure, lokal nicht", async () => {
  const vorher = process.env.NODE_ENV;
  try {
    for (const [umgebung, erwartet] of [["production", true], ["development", false]]) {
      process.env.NODE_ENV = umgebung;
      const bff = erstelleBff(() => ({ token: "tok_abc" }));
      await mitServer(bff, async (basis) => {
        const antwort = await sendeFormular(basis, "/anmelden", { email: "max@example.com", password: "geheim123" });
        assert.strictEqual(setCookies(antwort)[0].includes("Secure"), erwartet);
      });
    }
  } finally {
    if (vorher === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = vorher;
  }
});

test("Anmeldung: Falsche Zugangsdaten (401) zeigen die Meldung, setzen kein Cookie und behalten die E-Mail", async () => {
  const bff = erstelleBff(() => {
    throw new BffFehler(401, "Email or password is incorrect.");
  });
  await mitServer(bff, async (basis) => {
    const antwort = await sendeFormular(basis, "/anmelden", { email: "max@example.com", password: "falsch123" });
    const html = await antwort.text();
    assert.strictEqual(antwort.status, 401);
    assert.ok(html.includes("E-Mail-Adresse oder Passwort ist falsch."));
    assert.ok(html.includes('value="max@example.com"'));
    assert.ok(!html.includes("falsch123"));
    assert.deepStrictEqual(setCookies(antwort), []);
  });
});

test("Anmeldung: Leere Felder zeigen Fehler und rufen das BFF nicht auf", async () => {
  const bff = erstelleBff(() => ({ token: "x" }));
  await mitServer(bff, async (basis) => {
    const antwort = await sendeFormular(basis, "/anmelden", { email: "", password: "" });
    const html = await antwort.text();
    assert.strictEqual(antwort.status, 400);
    assert.ok(html.includes("Bitte gib deine E-Mail-Adresse ein."));
    assert.ok(html.includes("Bitte gib dein Passwort ein."));
    assert.strictEqual(bff.aufrufe.length, 0);
  });
});

test("Anmeldung: Ist das BFF nicht erreichbar, erscheint eine verständliche Meldung (503) ohne Cookie", async () => {
  const bff = erstelleBff(() => {
    throw new BffFehler(0, "BFF nicht erreichbar");
  });
  await mitServer(bff, async (basis) => {
    const antwort = await sendeFormular(basis, "/anmelden", { email: "max@example.com", password: "geheim123" });
    const html = await antwort.text();
    assert.strictEqual(antwort.status, 503);
    assert.ok(html.includes("Der Server ist gerade nicht erreichbar."));
    assert.deepStrictEqual(setCookies(antwort), []);
  });
});

test("Anmeldung: Liefert das BFF kein Token, wird kein Cookie gesetzt", async () => {
  const bff = erstelleBff(() => ({}));
  await mitServer(bff, async (basis) => {
    const antwort = await sendeFormular(basis, "/anmelden", { email: "max@example.com", password: "geheim123" });
    assert.strictEqual(antwort.status, 502);
    assert.deepStrictEqual(setCookies(antwort), []);
  });
});

// --> Abmeldung 

test("Abmeldung: Das Token geht als DELETE /auth ans BFF, das Cookie wird gelöscht, dann folgt die Startseite", async () => {
  const bff = erstelleBff(() => ({ message: "Logout successful." }));
  await mitServer(bff, async (basis) => {
    const antwort = await sendeFormular(basis, "/abmelden", {}, "cinerate_token=tok_abc");
    assert.strictEqual(antwort.status, 303);
    assert.strictEqual(antwort.headers.get("location"), "/");
    assert.strictEqual(bff.aufrufe[0].pfad, "/auth");
    assert.strictEqual(bff.aufrufe[0].methode, "DELETE");
    assert.strictEqual(bff.aufrufe[0].token, "tok_abc");

    const cookie = setCookies(antwort)[0];
    assert.ok(cookie.startsWith("cinerate_token=;"));
    assert.ok(cookie.includes("Expires=Thu, 01 Jan 1970"));
  });
});

test("Abmeldung: Ist das BFF nicht erreichbar, wird trotzdem abgemeldet", async () => {
  const bff = erstelleBff(() => {
    throw new BffFehler(0, "BFF nicht erreichbar");
  });
  await mitServer(bff, async (basis) => {
    const antwort = await sendeFormular(basis, "/abmelden", {}, "cinerate_token=tok_abc");
    assert.strictEqual(antwort.status, 303);
    assert.ok(setCookies(antwort)[0].startsWith("cinerate_token=;"));
  });
});

test("Abmeldung ohne Cookie ruft das BFF nicht auf", async () => {
  const bff = erstelleBff(() => ({}));
  await mitServer(bff, async (basis) => {
    const antwort = await sendeFormular(basis, "/abmelden", {});
    assert.strictEqual(antwort.status, 303);
    assert.strictEqual(bff.aufrufe.length, 0);
  });
});