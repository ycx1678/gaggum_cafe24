import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const markup = readFileSync(path.join(root, "nd/bulk_quote.html"), "utf8");
const script = readFileSync(path.join(root, "nd/js/bulk_quote_v199.js"), "utf8");

test("bulk quote always requires elevator access and postal-code address entry", () => {
  assert.match(markup, /name="elevatorAccess" required/);
  assert.match(markup, />엘리베이터로 이동 가능</);
  assert.match(markup, />계단으로만 이동 가능</);
  assert.match(markup, />계단 \+ 엘리베이터</);
  assert.match(markup, /name="postcode"[^>]*readonly required/);
  assert.match(markup, /id="ndBqFindAddress">주소검색</);
  assert.match(markup, /name="address1"[^>]*readonly required/);
  assert.match(markup, /name="address2"/);
  assert.match(script, /new window\.daum\.Postcode/);
  assert.match(script, /postcode: postcode/);
  assert.match(script, /address1: address1/);
  assert.match(script, /elevatorAccess: elevatorAccess/);
});

test("request examples remain placeholder-only and clear while typing", () => {
  assert.match(markup, /textarea[^>]*name="memo"[^>]*placeholder=/);
  assert.doesNotMatch(markup, /textarea[^>]*name="memo"[^>]*>\s*[^<\s]/);
  assert.match(script, /setAttribute\("placeholder", ""\)/);
});
