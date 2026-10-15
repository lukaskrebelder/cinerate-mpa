// Unit-Tests für die BFF-Aufrufe aus lib/bff.js.
const test = require("node:test");
const assert = require("node:assert");
const { anfrage, holeStatus, BffFehler } = require("../lib/bff");

// Ersetzt fetch für einen Test durch eine eigene Funktion und merkt sich den Aufruf.
// Nach dem Test wird das echte fetch wiederhergestellt.
async function mitFetch(ersatz, pruefung) {
  const original = globalThis.fetch;
  const aufrufe = [];
  globalThis.fetch = async (url, optionen) => {
    aufrufe.push({ url, optionen });
    return ersatz(url, optionen);
  };
  try {
    await pruefung(aufrufe);
  } finally {
    globalThis.fetch = original;
  }
}

// Baut eine Antwort, wie fetch sie liefert (ok, status und json()).
function antwort(status, inhalt) {
  return { ok: status >= 200 && status < 300, status, json: async () => inhalt };
}

process.env.BFF_URL = "http://bff.test";

test("anfrage liefert bei Erfolg den Inhalt der Antwort", async () => {
  await mitFetch(
    () => antwort(200, { nachricht: "ok" }),
    async () => {
      assert.deepStrictEqual(await anfrage("/status"), { nachricht: "ok" });
    }
  );
});

test("anfrage ruft die Adresse mit dem Präfix /bff und der Methode GET auf", async () => {
  await mitFetch(
    () => antwort(200, {}),
    async (aufrufe) => {
      await anfrage("/status");
      assert.strictEqual(aufrufe[0].url, "http://bff.test/bff/status");
      assert.strictEqual(aufrufe[0].optionen.method, "GET");
    }
  );
});

test("anfrage entfernt einen Schrägstrich am Ende der BFF-Adresse", async () => {
  const vorher = process.env.BFF_URL;
  process.env.BFF_URL = "http://bff.test/";
  try {
    await mitFetch(
      () => antwort(200, {}),
      async (aufrufe) => {
        await anfrage("/status");
        assert.strictEqual(aufrufe[0].url, "http://bff.test/bff/status");
      }
    );
  } finally {
    process.env.BFF_URL = vorher;
  }
});

test("anfrage sendet Daten als JSON im Body", async () => {
  await mitFetch(
    () => antwort(201, {}),
    async (aufrufe) => {
      const daten = { email: "max@example.com", password: "geheim123" };
      await anfrage("/auth", { methode: "POST", daten });
      assert.strictEqual(aufrufe[0].optionen.method, "POST");
      assert.strictEqual(aufrufe[0].optionen.headers["Content-Type"], "application/json");
      assert.deepStrictEqual(JSON.parse(aufrufe[0].optionen.body), daten);
    }
  );
});

test("anfrage schickt das Token im Header Authorization mit", async () => {
  await mitFetch(
    () => antwort(200, {}),
    async (aufrufe) => {
      await anfrage("/auth", { methode: "DELETE", token: "abc123" });
      assert.strictEqual(aufrufe[0].optionen.headers.Authorization, "Bearer abc123");
    }
  );
});

test("anfrage sendet ohne Token keinen Authorization-Header", async () => {
  await mitFetch(
    () => antwort(200, {}),
    async (aufrufe) => {
      await anfrage("/status");
      assert.strictEqual(aufrufe[0].optionen.headers.Authorization, undefined);
    }
  );
});

test("anfrage wirft bei einem Fehlerstatus einen BffFehler mit Status und Meldung", async () => {
  await mitFetch(
    () => antwort(401, { message: "Email or password is incorrect." }),
    async () => {
      await assert.rejects(anfrage("/auth", { methode: "POST", daten: {} }), (fehler) => {
        assert.ok(fehler instanceof BffFehler);
        assert.strictEqual(fehler.status, 401);
        assert.strictEqual(fehler.message, "Email or password is incorrect.");
        return true;
      });
    }
  );
});

test("anfrage wirft bei Netzwerkfehler einen BffFehler mit Status 0", async () => {
  await mitFetch(
    () => {
      throw new TypeError("fetch failed");
    },
    async () => {
      await assert.rejects(anfrage("/status"), (fehler) => {
        assert.ok(fehler instanceof BffFehler);
        assert.strictEqual(fehler.status, 0);
        return true;
      });
    }
  );
});

test("anfrage meldet einen Fehlerstatus auch dann, wenn die Antwort kein JSON ist", async () => {
  await mitFetch(
    () => ({
      ok: false,
      status: 503,
      json: async () => {
        throw new SyntaxError("kein JSON");
      },
    }),
    async () => {
      await assert.rejects(anfrage("/status"), (fehler) => {
        assert.ok(fehler instanceof BffFehler);
        assert.strictEqual(fehler.status, 503);
        return true;
      });
    }
  );
});

test("holeStatus ruft /bff/status auf", async () => {
  await mitFetch(
    () => antwort(200, { nachricht: "CineRate-BFF läuft" }),
    async (aufrufe) => {
      const status = await holeStatus();
      assert.ok(aufrufe[0].url.endsWith("/bff/status"));
      assert.strictEqual(status.nachricht, "CineRate-BFF läuft");
    }
  );
});