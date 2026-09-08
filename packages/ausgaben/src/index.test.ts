import { describe, expect, it } from "vitest";

import { htmlMaskieren, kopfAlsHtml } from "./index.js";

describe("Ausgabekopf", () => {
  it("maskiert Sonderzeichen", () => {
    expect(htmlMaskieren('<b>"A" & \'B\'</b>')).toBe("&lt;b&gt;&quot;A&quot; &amp; &#39;B&#39;&lt;/b&gt;");
  });

  it("nennt Einsatz, Kennung und Kernfassung", () => {
    const html = kopfAlsHtml({
      datum: "2026-09-08",
      einsatzName: "Hochwasser Süd",
      stand: "Stand: 08.09.2026, 14:12",
    });

    expect(html).toContain("<h1>Hochwasser Süd</h1>");
    expect(html).toMatch(/2026-09-08_hochwasser-sued_[0-9a-f]{6}/);
    expect(html).toContain("@bos/kern");
  });
});
