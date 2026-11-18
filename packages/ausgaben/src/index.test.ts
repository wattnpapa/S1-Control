import { describe, expect, it } from "vitest";

import { htmlMaskieren, kopfAlsHtml } from "./index.js";

describe("Ausgabekopf", () => {
  it("maskiert Sonderzeichen", () => {
    expect(htmlMaskieren('<b>"A" & \'B\'</b>')).toBe("&lt;b&gt;&quot;A&quot; &amp; &#39;B&#39;&lt;/b&gt;");
  });

  it("nennt Einsatz, Kennung und Programmfassung", () => {
    const html = kopfAlsHtml({
      datum: "2026-09-08",
      einsatzName: "Hochwasser Süd",
      stand: "Stand: 08.09.2026, 14:12",
    });

    expect(html).toContain("<h1>Hochwasser Süd</h1>");
    expect(html).toMatch(/2026-09-08_hochwasser-sued_[0-9a-f]{6}/);
    // R2-ETB P3-2: die Programmfassung statt „@bos/eeb-format 0.0.0“.
    expect(html).toContain('<p class="kern">S1-Control</p>');
    expect(html).not.toContain("@bos/eeb-format");
    expect(kopfAlsHtml({ datum: "2026-09-08", einsatzName: "X", stand: "S", programmversion: "2026.11.18" })).toContain('<p class="kern">S1-Control 2026.11.18</p>');
  });
});
