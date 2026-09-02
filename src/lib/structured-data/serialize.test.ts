import test from "node:test";
import assert from "node:assert/strict";
import { compact, serializeJsonLd } from "./serialize.ts";

test("drops null, undefined and blank strings", () => {
  const result = compact({
    a: "kept",
    b: null,
    c: undefined,
    d: "",
    e: "   ",
  } as Record<string, unknown>);
  assert.deepEqual(result, { a: "kept" });
});

test("keeps false and zero, which carry meaning", () => {
  assert.deepEqual(compact({ publicAccess: false, position: 0 }), {
    publicAccess: false,
    position: 0,
  });
});

test("prunes recursively and removes containers left empty", () => {
  const result = compact({
    address: { streetAddress: "", addressCountry: "IT" },
    geo: { latitude: null, longitude: undefined },
    sameAs: ["", null, "https://example.com"],
    actor: [],
  } as Record<string, unknown>);

  assert.deepEqual(result, {
    address: { addressCountry: "IT" },
    sameAs: ["https://example.com"],
  });
});

test("trims surrounding whitespace on retained strings", () => {
  assert.deepEqual(compact({ name: "  Nuovo Sacher  " }), { name: "Nuovo Sacher" });
});

test("escapes < so a synopsis cannot break out of the script element", () => {
  const payload = serializeJsonLd({
    description: "A film about </script><!-- hacking --> and <b>markup</b>.",
  });

  assert.ok(!payload.includes("</script>"));
  assert.ok(!payload.includes("<!--"));
  assert.ok(!payload.includes("<"));
  assert.match(payload, /\\u003c/);

  // Still valid JSON that round-trips to the original text.
  const parsed = JSON.parse(payload) as { description: string };
  assert.equal(parsed.description, "A film about </script><!-- hacking --> and <b>markup</b>.");
});

test("escapes the line and paragraph separators", () => {
  const LS = "\u2028";
  const PS = "\u2029";
  const payload = serializeJsonLd({ description: `a${LS}b${PS}c` });

  assert.ok(!payload.includes(LS));
  assert.ok(!payload.includes(PS));
  assert.equal((JSON.parse(payload) as { description: string }).description, `a${LS}b${PS}c`);
});
