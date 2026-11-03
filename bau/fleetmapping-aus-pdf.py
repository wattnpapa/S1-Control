#!/usr/bin/env python3
"""
Erzeugt apps/desktop/src/renderer/fleetmapping/tmo-rufgruppen.json aus den
PDF-Übersichten „TMO-Rufgruppenübersicht LV <XY> <Jahr>-<Monat>-V<n>" der
Landesverbände (BOS-Fleetmapping des THW).

Aufruf:  python3 -I bau/fleetmapping-aus-pdf.py <Ordner mit den PDFs> <Ausgabedatei> <Stand>
Beispiel: python3 -I bau/fleetmapping-aus-pdf.py ./pdf apps/desktop/src/renderer/fleetmapping/tmo-rufgruppen.json 2024-06-V0

Braucht pdfplumber. Das Ergebnis wird eingecheckt, die PDFs nicht.
"""
import glob, json, re, sys
import pdfplumber

LAENDER = ["HBNI", "HHMVSH", "HERPSL", "NW", "SNTH"]


def lies(pdf_pfad):
    zeilen = []
    with pdfplumber.open(pdf_pfad) as pdf:
        for seite in pdf.pages:
            for tabelle in seite.extract_tables():
                for z in tabelle:
                    zellen = [(c or "").replace("\n", " ").strip() for c in z]
                    if len(zellen) == 6 and zellen[2] and not zellen[0].startswith("Kurzwahl"):
                        zeilen.append(zellen)
    return zeilen


def main(ordner, ausgabe, stand):
    eintraege = {}   # name -> [ordner-tuple, kurzwahl-Menge, maske]
    for bit, lv in enumerate(LAENDER):
        pfade = glob.glob(f"{ordner}/*LV-{lv}-*.pdf")
        if len(pfade) != 1:
            sys.exit(f"Genau eine PDF für LV {lv} erwartet, gefunden: {pfade}")
        for kw_alt, kw_neu, name, haupt, u1, u2 in lies(pfade[0]):
            pfad = tuple(t for t in (haupt, u1, u2) if t)
            e = eintraege.setdefault(name, [pfad, set(), 0])
            e[1].add(kw_neu)
            e[2] |= 1 << bit
    ordnerliste, index, ausgabe_eintraege = [], {}, []
    for name, (pfad, kws, maske) in eintraege.items():
        if pfad not in index:
            index[pfad] = len(ordnerliste)
            ordnerliste.append(list(pfad))
        kw = int(next(iter(kws))) if len(kws) == 1 and re.fullmatch(r"\d+", next(iter(kws))) else 0
        ausgabe_eintraege.append([name, index[pfad], kw, maske])
    daten = {"stand": stand, "laender": LAENDER, "ordner": ordnerliste, "eintraege": ausgabe_eintraege}
    with open(ausgabe, "w", encoding="utf-8") as f:
        json.dump(daten, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
    print(f"{len(ausgabe_eintraege)} Rufgruppen, {len(ordnerliste)} Ordner")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
