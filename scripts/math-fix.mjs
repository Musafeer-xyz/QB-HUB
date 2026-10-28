import fs from "node:fs";
import path from "node:path";

const SRC = "Math/data";
const OUT = "Math/ready";
const LABEL = "ঘ";
const MARKS = 4;

fs.mkdirSync(path.join(OUT, "images"), { recursive: true });
for (const f of fs.readdirSync(SRC).filter((n) => n.endsWith(".json"))) {
  const items = JSON.parse(fs.readFileSync(path.join(SRC, f), "utf8"));
  const out = items.map((it) => {
    if (it.type !== "CQ" || it.parts) return it;
    const { question, ...rest } = it;
    return {
      ...rest,
      stem: [],
      parts: [{ label: LABEL, marks: MARKS, text: question, answer: null }],
    };
  });
  fs.writeFileSync(path.join(OUT, f), JSON.stringify(out, null, 1) + "\n", "utf8");
  console.log(f, out.length);
}