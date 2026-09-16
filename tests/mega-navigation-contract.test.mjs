import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const read = (path) => readFileSync(path, "utf8");

test("강의실 가구의 여섯 하위 카테고리는 데스크톱 메가메뉴 첫 줄에 모두 배치된다", () => {
  const header = read("nd/layout/header.html");
  const css = read("nd/css/header_mega_v13.css");

  assert.match(header, /<!--@css\(\/nd\/css\/header_mega_v13\.css\)-->/);
  assert.match(header, /ND_SKIN16_MEGA_CATEGORY_START/);
  assert.match(header, /ND_SKIN16_MEGA_CATEGORY_END/);
  assert.match(css, /\.nd-mega-gnb__columns\{display:grid;grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
});

test("메가메뉴 활성 표시는 기본 스킨의 호버 표식과 분리되어 메뉴 위에서 유지된다", () => {
  const css = read("nd/css/header_mega_v13.css");

  assert.match(css, /header \.nd-mega-gnb \.nd-mega-gnb__item > a::before\{content:none;\}/);
  assert.match(css, /header \.nd-mega-gnb__item > a::after\{[^}]*opacity:0[^}]*transform:translate\(-50%,-10px\)/);
  assert.match(css, /header \.nd-mega-gnb__item > a\[aria-expanded="true"\]::after\{opacity:1;transform:translate\(-50%,0\);\}/);
});

test("자습실과 학원 운영 공간의 짧은 서브메뉴는 각 상위 메뉴 아래에서 시작한다", () => {
  const header = read("nd/layout/header.html");
  const css = read("nd/css/header_mega_v13.css");
  const position = read("nd/js/header_mega_position_v4.js");

  assert.match(header, /<!--@css\(\/nd\/css\/header_mega_v13\.css\)-->/);
  assert.match(header, /<!--@js\(\/nd\/js\/header_mega_position_v4\.js\)-->/);
  assert.match(css, /\.nd-mega-gnb__columns\{[^}]*transform:translateX\(var\(--nd-mega-gnb-columns-shift,0px\)\)/);
  assert.match(position, /var desiredShift = activeLinkBox\.left - firstColumnBox\.left;/);
  assert.match(position, /if \(columns\.children\.length >= 6\) return setColumnsShift\(columns, 0\);/);
  assert.match(position, /setColumnsShift\(columns, Math\.round\(boundedShift\)\);/);
});

test("상단 브랜드 소개와 기획전 메뉴는 지정된 외부 경로를 사용한다", () => {
  const header = read("nd/layout/header.html");

  assert.match(header, /<a href="\/nd\/product\.html">브랜드 소개<\/a>/);
  assert.match(header, /<a href="\/front\/php\/b\/board_list\.php\?board_no=15">기획전 \/ 이벤트<\/a>/);
});

test("모바일 사이드메뉴는 데스크톱과 같은 세 상위 가구 카테고리를 사용한다", () => {
  const side = read("nd/layout/side.html");
  const script = read("nd/js/side_mega_v1.js");

  assert.match(side, /data-nd-mobile-mega-parent="162"/);
  assert.match(side, /data-nd-mobile-mega-parent="163"/);
  assert.match(side, /data-nd-mobile-mega-parent="164"/);
  assert.match(side, /<!--@js\(\/nd\/js\/side_mega_v1\.js\)-->/);
  assert.match(side, /ND_SKIN16_MOBILE_CATEGORY_START/);
  assert.match(side, /ND_SKIN16_MOBILE_CATEGORY_END/);
  assert.match(script, /\[data-nd-mobile-mega-parent\]/);
});

test("모바일 사이드메뉴는 API의 각 상위 카테고리 하위 항목을 해당 메뉴 안에만 표시한다", async () => {
  const makeItem = (parentId) => {
    const list = {
      innerHTML: "stale",
      children: [],
      appendChild(node) { this.children.push(node); },
      remove() { this.removed = true; },
    };
    return {
      getAttribute(name) { return name === "data-nd-mobile-mega-parent" ? parentId : null; },
      querySelector(selector) {
        if (selector === "ul") return list;
        return null;
      },
      list,
    };
  };
  const classroom = makeItem("162");
  const study = makeItem("163");
  const operations = makeItem("164");
  const document = {
    readyState: "complete",
    querySelectorAll(selector) {
      return selector === "[data-nd-mobile-mega-parent]" ? [classroom, study, operations] : [];
    },
    createElement(tagName) {
      return {
        tagName,
        children: [],
        appendChild(node) { this.children.push(node); },
      };
    },
  };
  const window = {
    document,
    location: { pathname: "/skin-skin16/" },
    fetch: async () => ({
      ok: true,
      json: async () => [
        { cate_no: 165, parent_cate_no: 162, name: "학원 책걸상 세트" },
        { cate_no: 166, parent_cate_no: 162, name: "학원 책상 단품" },
        { cate_no: 188, parent_cate_no: 163, name: "자습실 책상 세트" },
        { cate_no: 194, parent_cate_no: 164, name: "교무실 집기" },
      ],
    }),
  };

  vm.runInNewContext(read("nd/js/side_mega_v1.js"), { Array, document, Error, String, window });
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(
    JSON.parse(JSON.stringify(classroom.list.children.map((item) => item.children[0].textContent))),
    ["학원 책걸상 세트", "학원 책상 단품"],
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(study.list.children.map((item) => item.children[0].textContent))),
    ["자습실 책상 세트"],
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(operations.list.children.map((item) => item.children[0].textContent))),
    ["교무실 집기"],
  );
  assert.equal(classroom.list.children[0].children[0].href, "/skin-skin16/product/list.html?cate_no=165");
});

test("모바일 카테고리 API를 사용할 수 없으면 상위 카테고리 링크는 그대로 이동한다", () => {
  const list = { remove() { this.removed = true; } };
  const item = {
    children: [list],
    getAttribute() { return "162"; },
    querySelector(selector) { return selector === "ul" ? list : null; },
  };
  const document = {
    readyState: "complete",
    querySelectorAll() { return [item]; },
  };
  const window = { document, location: { pathname: "/" } };

  vm.runInNewContext(read("nd/js/side_mega_v1.js"), { Array, document, Error, String, window });

  assert.equal(list.removed, true);
});
