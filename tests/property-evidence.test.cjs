const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function load(path, mocks) {
  const compiled = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const sandbox = { exports: {}, console, Date, Math, Map, Promise, setTimeout,
    require(name) {
      assert.ok(name in mocks, `Unexpected import ${name}`);
      return mocks[name];
    } };
  vm.runInNewContext(compiled, sandbox);
  return sandbox.exports;
}
function nativeStore() {
  const metadata = new Map();
  const files = new Map();
  let writeFailure = false;
  const store = load("client/lib/evidence-store.ts", {
    "@react-native-async-storage/async-storage": {
      getItem: async key => metadata.get(key) ?? null,
      setItem: async (key, value) => { metadata.set(key, value); },
    },
    "react-native": { Platform: { OS: "android" } },
    "expo-file-system/legacy": {
      documentDirectory: "file:///documents/",
      readAsStringAsync: async uri => {
        assert.ok(files.has(uri));
        return files.get(uri);
      },
      writeAsStringAsync: async (uri, data) => {
        if (writeFailure) throw new Error("disk full");
        files.set(uri, data);
      },
      deleteAsync: async uri => { files.delete(uri); },
    },
  }).evidenceStore;
  return { store, metadata, files, failWrites: () => { writeFailure = true; } };
}

test("property badges parse bed/bath/parking and agent without fabricating absent data", () => {
  const { parsePropertyDetails } = load("client/lib/property-details.ts", {});
  const result = parsePropertyDetails("3 bedrooms · 2 baths · 1 car park\nAgent: Sample Agent");
  assert.equal(result.beds, 3);
  assert.equal(result.baths, 2);
  assert.equal(result.parks, 1);
  assert.equal(result.agent, "Sample Agent");
  const missing = parsePropertyDetails("An inviting home");
  assert.equal(missing.beds, null);
  assert.equal(missing.baths, null);
  assert.equal(missing.parks, null);
});

test("large native evidence uses document files instead of oversized AsyncStorage rows", async () => {
  const { store, metadata, files } = nativeStore();
  const content = "evidence".repeat(1024 * 1024);
  await store.updateItem("photos", () => content);
  assert.equal(await store.getItem("photos"), content);
  assert.ok(metadata.get("photos_file").length < 200);
  assert.equal(files.size, 1);
  await store.updateItem("photos", () => "replacement");
  assert.equal(files.size, 1);
  assert.equal(await store.getItem("photos"), "replacement");
});

test("concurrent evidence updates are serialized without losing records", async () => {
  const { store } = nativeStore();
  await Promise.all(Array.from({ length: 6 }, (_, i) => store.updateItem("cache", raw =>
    JSON.stringify([...JSON.parse(raw || "[]"), i]))));
  assert.deepEqual(JSON.parse(await store.getItem("cache")), [0, 1, 2, 3, 4, 5]);
});

test("failed write preserves previous evidence and malformed data is not overwritten", async () => {
  const { store, failWrites } = nativeStore();
  await store.updateItem("draft", () => '{"saved":true}');
  await assert.rejects(store.updateItem("draft", () => { throw new Error("invalid data"); }));
  assert.equal(await store.getItem("draft"), '{"saved":true}');
  failWrites();
  await assert.rejects(store.updateItem("draft", () => "new"), /disk full/);
  assert.equal(await store.getItem("draft"), '{"saved":true}');
});

test("customer booking cards render covers and warm fallback without unsafe photo HTML", () => {
  const html = fs.readFileSync("server/templates/booking.html", "utf8");
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  for (const script of scripts) new Function(script);
  const functions = scripts.join("\n").match(/function escapeListingText[\s\S]*?(?=\n    function selectService)/)?.[0];
  assert.ok(functions);
  const list = { innerHTML: "" };
  const sandbox = {
    document: { getElementById: () => list },
    business: { name: "Sample Agency" },
    services: [{ id: "fixture", name: "<Home>", description: "3 bed 2 bath 1 park", price: 0, duration: 30, photos: ["https://images.fixture.invalid/cover.jpg"] }],
  };
  vm.runInNewContext(`${functions}\nrenderServices();`, sandbox);
  assert.match(list.innerHTML, /<img class="listing-cover"/);
  assert.match(list.innerHTML, /&lt;Home&gt;/);
  assert.match(list.innerHTML, /3 bed/);
  sandbox.services[0].photos = ['javascript:alert("unsafe")'];
  vm.runInNewContext("renderServices();", sandbox);
  assert.match(list.innerHTML, /listing-placeholder/);
  assert.ok(!list.innerHTML.includes("javascript:"));
});