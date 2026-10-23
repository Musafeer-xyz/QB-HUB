import { describe, expect, it } from "vitest";
import { isYoutubeId, parseYoutubeId } from "./video";

const ID = "dQw4w9WgXcQ";

describe("parseYoutubeId", () => {
  it("accepts every supported YouTube form", () => {
    expect(parseYoutubeId(ID)).toBe(ID);
    expect(parseYoutubeId(`https://youtu.be/${ID}`)).toBe(ID);
    expect(parseYoutubeId(`https://youtu.be/${ID}?t=42`)).toBe(ID);
    expect(parseYoutubeId(`https://www.youtube.com/watch?v=${ID}`)).toBe(ID);
    expect(parseYoutubeId(`https://m.youtube.com/watch?v=${ID}&list=PL1`)).toBe(ID);
    expect(parseYoutubeId(`youtube.com/watch?v=${ID}`)).toBe(ID);
    expect(parseYoutubeId(`https://www.youtube.com/shorts/${ID}`)).toBe(ID);
    expect(parseYoutubeId(`https://www.youtube.com/embed/${ID}`)).toBe(ID);
    expect(parseYoutubeId(`  ${ID}  `)).toBe(ID);
  });

  it("rejects everything else, including script and malformed ids", () => {
    expect(parseYoutubeId("")).toBeNull();
    expect(parseYoutubeId(null)).toBeNull();
    expect(parseYoutubeId(undefined)).toBeNull();
    expect(parseYoutubeId("javascript:alert(1)")).toBeNull();
    expect(parseYoutubeId("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(parseYoutubeId("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(parseYoutubeId("https://www.youtube.com/playlist?list=PL123")).toBeNull();
    expect(parseYoutubeId("https://www.youtube.com/@channel")).toBeNull();
    expect(parseYoutubeId(`${ID}extra`)).toBeNull();
    expect(parseYoutubeId("dQw4w9WgXc")).toBeNull();
    expect(parseYoutubeId("https://youtu.be/dQw4w9WgXcQextra")).toBeNull();
    expect(parseYoutubeId("https://youtube.com/watch?v=dQw4w9WgXcQ&t=1")).toBe(ID);
  });

  it("only exposes a validated id as a thumbnail or embed", () => {
    expect(isYoutubeId(ID)).toBe(true);
    expect(isYoutubeId("short")).toBe(false);
  });
});
