import fs from "node:fs";

for (const f of ["Math/data/math-02.json", "Math/data/math-17.json"]) {
  const t = fs.readFileSync(f, "utf8");
  const ids = JSON.parse(t).filter((x) => x.stars === 0).map((x) => x.id);
  const out = t.replaceAll('"stars":0,', '"stars":null,');
  JSON.parse(out);
  fs.writeFileSync(f, out);
  console.log(f, ids.length, ids.join(" "));
}