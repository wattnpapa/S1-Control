/**
 * THW-StAN-Datensatz, Stand 01.07.2026 (M1.4).
 *
 * Erzeugt aus `legacy-v1/thw-stan-2025.generated.json`, das v1 aus den
 * StAN-PDFs gewonnen hat. Uebernommen sind Kennung, Titel, Quelldatei,
 * Sollstaerke und Fahrzeugliste; die taktischen Zeichen der v1-Fassung sind
 * **nicht** uebernommen, weil sie dort aus einer Heuristik stammten und in v2
 * die Zeichen-Inferenz aus `../zeichen/` dieselbe Aufgabe mit benannten Regeln
 * erledigt.
 *
 * Die Sollstaerke traegt die Rollennamen des Zielmodells (Zieldatenmodell
 * §2.5: `fuehrer`/`unterfuehrer`/`mannschaft`), nicht die v1-Namen
 * `fuehrung`/`unterfuehrung`/`mannschaft`.
 *
 * Der Datensatz ist Stammdatum, kein Ereignis: Nach KONZEPT-EREIGNISSE.md §1.2
 * sind Vorlagen global und nicht einsatzgebunden. Eine `EinheitVorlage`
 * verweist ueber `vorlageId` auf eine Kennung dieser Liste.
 */

export interface StanEintrag {
  readonly id: string;
  readonly titel: string;
  readonly quelldatei?: string;
  readonly sollStaerke?: { readonly fuehrer: number; readonly unterfuehrer: number; readonly mannschaft: number };
  readonly fahrzeuge?: readonly string[];
}

/** Die 48 Eintraege der StAN. */
export const THW_STAN: readonly StanEintrag[] = [
  {
    "id": "lastkraftwagen-1-5-t-nutzlast-mit-ladekran-780-knm",
    "titel": "Lastkraftwagen (1,5 t Nutzlast) mit Ladekran (780 kNm)",
    "quelldatei": "00-00 StAN-Vorbemerkung-bf.pdf",
    "fahrzeuge": [
      "Lastkraftwagen (1,5 t Nutzlast) mit Ladekran (780 kNm)",
      "LKW Ladekran) ist die Zusatz-funktion Bediener/in Mobilkran o-"
    ]
  },
  {
    "id": "erganzungsausstattung",
    "titel": "(Ergänzungsausstattung)",
    "quelldatei": "00-01 STAN OV.pdf",
    "sollStaerke": {
      "fuehrer": 2,
      "unterfuehrer": 2,
      "mannschaft": 6
    },
    "fahrzeuge": [
      "Mannschaftstransportwagen OV",
      "Personenkraftwagen OV",
      "Gabelstapler (Ergänzungsausstattung)",
      "Anhänger 0,5 t Nutzlast"
    ]
  },
  {
    "id": "mt",
    "titel": "(MT)",
    "quelldatei": "00-06 StAN MT-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 2,
      "mannschaft": 7
    },
    "fahrzeuge": [
      "Mannschaftstransportwagen TZ",
      "Anhänger mit Spezialaufbau MT (2 t Zuladung)",
      "Fahrzeug (PKW, MTW) für die Fahrt zur Einsatzstelle, während des Einsatzes, sowie für die Rückfahrt"
    ]
  },
  {
    "id": "vost",
    "titel": "(VOST)",
    "quelldatei": "00-07 StAN VOST-bf.pdf",
    "sollStaerke": {
      "fuehrer": 1,
      "unterfuehrer": 13,
      "mannschaft": 32
    }
  },
  {
    "id": "tz",
    "titel": "TZ",
    "quelldatei": "02-00 STAN TZ.pdf",
    "sollStaerke": {
      "fuehrer": 1,
      "unterfuehrer": 1,
      "mannschaft": 2
    },
    "fahrzeuge": [
      "Mannschaftstransportwagen"
    ]
  },
  {
    "id": "ztr-tz",
    "titel": "(ZTr TZ)",
    "quelldatei": "02-01 StAN ZTr TZ-bf.pdf",
    "sollStaerke": {
      "fuehrer": 1,
      "unterfuehrer": 1,
      "mannschaft": 2
    },
    "fahrzeuge": [
      "Führungskraftwagen"
    ]
  },
  {
    "id": "b",
    "titel": "(B)",
    "quelldatei": "02-02 StAN B-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 2,
      "mannschaft": 10
    },
    "fahrzeuge": [
      "Gerätekraftwagen (7 t Nutzlast)",
      "Anhänger Plane/Spriegel mit Aufnahmen für Container",
      "Anhänger Plattform Runge (12 t Zuladung)"
    ]
  },
  {
    "id": "fgr-r-a",
    "titel": "(FGr R (A))",
    "quelldatei": "02-04a StAN R (A)-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 2,
      "mannschaft": 7
    },
    "fahrzeuge": [
      "Lastkraftwagen Kipper (ca. 9 t Zuladung)",
      "Anhänger Tieflader mit Aufnahmen für Container",
      "Anhänger Drucklufterzeuger"
    ]
  },
  {
    "id": "fgr-r-b",
    "titel": "(FGr R (B))",
    "quelldatei": "02-04b StAN R (B)-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 2,
      "mannschaft": 7
    },
    "fahrzeuge": [
      "Lastkraftwagen Kipper (ca. 9 t Zuladung)",
      "Anhänger Tieflader mit Aufnahmen für Container",
      "Anhänger Drucklufterzeuger"
    ]
  },
  {
    "id": "fgr-r-c",
    "titel": "(FGr R (C))",
    "quelldatei": "02-04c StAN R (C)-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 2,
      "mannschaft": 7
    },
    "fahrzeuge": [
      "Lastkraftwagen Kipper (ca. 9 t Zuladung)",
      "Anhänger Tieflader mit Aufnahmen für Container",
      "Anhänger Drucklufterzeuger"
    ]
  },
  {
    "id": "fgr-w-a",
    "titel": "(FGr W (A))",
    "quelldatei": "02-05a StAN W (A)-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 3,
      "mannschaft": 9
    },
    "fahrzeuge": [
      "Lastkraftwagen (gf, 7 t Nutzlast) mit Ladekran",
      "Anhänger Mehrzweckarbeits-",
      "Mehrzweckarbeitsboot"
    ]
  },
  {
    "id": "fgr-w-b",
    "titel": "(FGr W (B))",
    "quelldatei": "02-05b StAN W (B)-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 3,
      "mannschaft": 9
    },
    "fahrzeuge": [
      "Lastkraftwagen (gf, 7 t Nutzlast) mit Ladekran",
      "Anhänger Plattform mit Aufnahmen für Container"
    ]
  },
  {
    "id": "fgr-brb",
    "titel": "(FGr BrB)",
    "quelldatei": "02-06 StAN BrB-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 4,
      "mannschaft": 14
    },
    "fahrzeuge": [
      "Mehrzweckgerätewagen mit Ladebordwand",
      "Anhänger Plattform mit Aufnahmen für Container"
    ]
  },
  {
    "id": "fgr-o-a",
    "titel": "(FGr O (A))",
    "quelldatei": "02-07a StAN O (A)-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 2,
      "mannschaft": 7
    },
    "fahrzeuge": [
      "Mannschaftstransportwagen TZ",
      "Anhänger mit Spezialaufbau FGr O (2 t Zuladung)"
    ]
  },
  {
    "id": "fgr-o-b",
    "titel": "(FGr O (B))",
    "quelldatei": "02-07b StAN O (B)-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 2,
      "mannschaft": 7
    },
    "fahrzeuge": [
      "Mannschaftstransportwagen TZ",
      "Anhänger mit Spezialaufbau FGr O (2 t Zuladung)"
    ]
  },
  {
    "id": "fgr-o-c",
    "titel": "(FGr O (C))",
    "quelldatei": "02-07c StAN O (C)-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 2,
      "mannschaft": 4
    },
    "fahrzeuge": [
      "Mannschaftstransportwagen TZ"
    ]
  },
  {
    "id": "fgr-sp",
    "titel": "(FGr Sp)",
    "quelldatei": "02-08 StAN Sp-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 2,
      "mannschaft": 4
    },
    "fahrzeuge": [
      "Mannschaftstransportwagen FGr",
      "Anhänger mit Spezialaufbau FGr Sp (2 t Zuladung)"
    ]
  },
  {
    "id": "fgr-n",
    "titel": "(FGr N)",
    "quelldatei": "02-09 StAN N-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 2,
      "mannschaft": 7
    },
    "fahrzeuge": [
      "Mehrzweckgerätewagen Plane/Spriegel mit Ladebordwand",
      "Gabelstapler (mind. 3 t Hubkraft)",
      "Kleines Boot",
      "Anhänger kleines Boot",
      "Anhänger Plattform mit Aufnahmen für Container",
      "Anhänger Netzersatzanlage mit Lichtmastanlage"
    ]
  },
  {
    "id": "seeba",
    "titel": "SEEBA",
    "quelldatei": "02-11 STAN SEEBA.pdf",
    "sollStaerke": {
      "fuehrer": 3,
      "unterfuehrer": 12,
      "mannschaft": 6
    },
    "fahrzeuge": [
      "3/9/0/12 Personenkraftwagen,"
    ]
  },
  {
    "id": "fgr-sb-a",
    "titel": "(FGr SB (A))",
    "quelldatei": "02-13a StAN SB (A)-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 3,
      "mannschaft": 9
    },
    "fahrzeuge": [
      "Mehrzweckgerätewagen Plane/Spriegel mit Ladebordwand"
    ]
  },
  {
    "id": "fgr-sb-b",
    "titel": "(FGr SB (B))",
    "quelldatei": "02-13b StAN SB (B)-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 3,
      "mannschaft": 9
    },
    "fahrzeuge": [
      "Mehrzweckgerätewagen Plane/Spriegel mit Ladebordwand",
      "Anhänger Plattform mit Aufnahmen für Container"
    ]
  },
  {
    "id": "tr-ess",
    "titel": "(Tr ESS)",
    "quelldatei": "02-14 StAN Tr ESS-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 1,
      "mannschaft": 3
    },
    "fahrzeuge": [
      "Mannschaftstransportwagen TZ"
    ]
  },
  {
    "id": "tr-mhp",
    "titel": "(Tr MHP)",
    "quelldatei": "02-15 StAN Tr MHP-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 1,
      "mannschaft": 3
    },
    "fahrzeuge": [
      "Mannschaftstransportwagen (geländegängig)"
    ]
  },
  {
    "id": "tr-ul",
    "titel": "(Tr UL)",
    "quelldatei": "02-16 StAN Tr UL-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 1,
      "mannschaft": 3
    },
    "fahrzeuge": [
      "Mannschaftstransportwagen TZ"
    ]
  },
  {
    "id": "fgr-bt",
    "titel": "(FGr BT)",
    "quelldatei": "02-17 StAN BT-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 2,
      "mannschaft": 7
    },
    "fahrzeuge": [
      "Mannschaftslastwagen IV Plane/Spriegel mit Ladebordwand",
      "Anhänger"
    ]
  },
  {
    "id": "fgr-i",
    "titel": "(FGr I)",
    "quelldatei": "03-01 StAN I-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 3,
      "mannschaft": 9
    },
    "fahrzeuge": [
      "Mannschaftslastwagen IV Plane/Spriegel mit Ladebordwand",
      "Mannschaftstransportwagen FGr",
      "Anhänger mit Spezialaufbau für FGr I (2 t Nutzlast)"
    ]
  },
  {
    "id": "fgr-e",
    "titel": "(FGr E)",
    "quelldatei": "03-02 StAN E-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 2,
      "mannschaft": 7
    },
    "fahrzeuge": [
      "Lastkraftwagen Plane/Spriegel mit Ladebordwand",
      "Anhänger Netzersatzanlage (ca. 200 kVA)",
      "Anhänger Netzersatzanlage (ca. 650 kVA)"
    ]
  },
  {
    "id": "fgr-tw",
    "titel": "(FGr TW)",
    "quelldatei": "03-03 StAN TW-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 3,
      "mannschaft": 15
    },
    "fahrzeuge": [
      "Lastkraftwagen Plane/Spriegel mit Ladebordwand",
      "Anhänger Trinkwasseraufbereitungsanlage",
      "Stapler (2 t Hubkraft, geländefähig)",
      "Anhänger BDF Lafette"
    ]
  },
  {
    "id": "fgr-wp-a",
    "titel": "(FGr WP (A))",
    "quelldatei": "03-04a StAN WP (A)-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 3,
      "mannschaft": 9
    },
    "fahrzeuge": [
      "Lastkraftwagen Plane/Spriegel mit Ladebordwand",
      "Mannschaftslastwagen IV Plane/Spriegel mit Ladebordwand",
      "Anhänger mit Schmutzwasser-Kreiselpumpe",
      "Anhänger Plane/Spriegel mit Aufnahmen für Container"
    ]
  },
  {
    "id": "fgr-wp-b",
    "titel": "(FGr WP (B))",
    "quelldatei": "03-04b StAN WP (B)-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 3,
      "mannschaft": 9
    },
    "fahrzeuge": [
      "Lastkraftwagen Plane/Spriegel mit Ladebordwand",
      "Mannschaftslastwagen IV Plane/Spriegel mit Ladebordwand",
      "Anhänger mit Schmutzwasser-Kreiselpumpe",
      "Anhänger Plane/Spriegel mit Aufnahmen für Container"
    ]
  },
  {
    "id": "fgr-wp-c",
    "titel": "(FGr WP (C))",
    "quelldatei": "03-04c StAN WP (C)-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 3,
      "mannschaft": 9
    },
    "fahrzeuge": [
      "Lastkraftwagen Plane/Spriegel mit Ladebordwand",
      "Mannschaftslastwagen IV Plane/Spriegel mit Ladebordwand",
      "Anhänger mit Schmutzwasser-Kreiselpumpe",
      "Anhänger Plane/Spriegel mit Aufnahmen für Container"
    ]
  },
  {
    "id": "fgr-ol-a",
    "titel": "(FGr Öl (A))",
    "quelldatei": "03-05a StAN �l (A)-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 4,
      "mannschaft": 14
    },
    "fahrzeuge": [
      "Lastkraftwagen Wechsellader",
      "Lastkraftwagen (7 t Nutzlast) mit Ladekran",
      "Anhänger Plattform mit Aufnahmen für Container"
    ]
  },
  {
    "id": "fgr-ol-b",
    "titel": "(FGr Öl (B))",
    "quelldatei": "03-05b StAN �l (B)-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 4,
      "mannschaft": 14
    },
    "fahrzeuge": [
      "Lastkraftwagen Wechsellader",
      "Lastkraftwagen (9 t Nutzlast) mit Ladekran",
      "Anhänger Plattform mit Aufnahmen für Container"
    ]
  },
  {
    "id": "fgr-ol-c",
    "titel": "(FGr Öl (C))",
    "quelldatei": "03-05c StAN �l (C)-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 4,
      "mannschaft": 14
    },
    "fahrzeuge": [
      "Lastkraftwagen Wechsellader",
      "Stapler (3 t Hubkraft, geländefähig)",
      "Anhänger Plattform mit Aufnahmen für Container"
    ]
  },
  {
    "id": "die-seewa-ist-gebietsma-ig-bundesweit-in-3-module-mit-jeweils-einer-fachgruppe-als",
    "titel": "Die SEEWA ist gebietsmäßig bundesweit in 3 Module mit jeweils einer Fachgruppe als",
    "quelldatei": "03-10 STAN SEEWA.pdf",
    "sollStaerke": {
      "fuehrer": 1,
      "unterfuehrer": 2,
      "mannschaft": 10
    },
    "fahrzeuge": [
      "Anhänger 2 t, Plane/Spriegel",
      "Anhänger 1,6 t, Kofferaufbau"
    ]
  },
  {
    "id": "ent",
    "titel": "(ENT)",
    "quelldatei": "06-01 StAN ENT-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 3,
      "mannschaft": 11
    }
  },
  {
    "id": "3-1-seelift",
    "titel": "3.1 SEElift",
    "quelldatei": "09-03 STAN SEElift.pdf",
    "sollStaerke": {
      "fuehrer": 5,
      "unterfuehrer": 2,
      "mannschaft": 6
    },
    "fahrzeuge": [
      "Personenkraftwagen Kombi",
      "Mannschaftstransportwagen",
      "Anhänger 0,6 t"
    ]
  },
  {
    "id": "ztr-fz-log",
    "titel": "(ZTr FZ Log)",
    "quelldatei": "09-04 StAN ZTr Log-bf.pdf",
    "sollStaerke": {
      "fuehrer": 1,
      "unterfuehrer": 1,
      "mannschaft": 2
    },
    "fahrzeuge": [
      "Führungskraftwagen"
    ]
  },
  {
    "id": "fgr-log-mw",
    "titel": "(FGr Log-MW)",
    "quelldatei": "09-05 StAN Log-MW-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 3,
      "mannschaft": 9
    },
    "fahrzeuge": [
      "LKW (gf), Ladekran",
      "Anhänger Plattform",
      "PKW (gl)",
      "Anhänger mit Spezialaufbau für FGr Log-MW"
    ]
  },
  {
    "id": "fgr-log-v",
    "titel": "(FGr Log-V)",
    "quelldatei": "09-06 StAN Log-V-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 3,
      "mannschaft": 9
    },
    "fahrzeuge": [
      "Lastkraftwagen mit Ladebordwand",
      "Mannschaftstransportwagen FGr",
      "Anhänger 12t, Koffer, ohne Flurförderzeug be- und entladbar",
      "Anhänger mit Spezialaufbau für FGr Log-V, Kühl",
      "Bei dieser Alternative werden die Module des FKH, wo dies möglich ist, auf den Anhänger 12to verla-"
    ]
  },
  {
    "id": "tr-ts",
    "titel": "(Tr TS)",
    "quelldatei": "09-07 StAN Tr TS-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 1,
      "mannschaft": 3
    }
  },
  {
    "id": "sys-br500",
    "titel": "Sys BR500",
    "quelldatei": "09-10 STAN  Sys BR500.pdf"
  },
  {
    "id": "ztr-fz-fk",
    "titel": "(ZTr FZ FK)",
    "quelldatei": "10-03 StAN ZTr FK-bf.pdf",
    "sollStaerke": {
      "fuehrer": 1,
      "unterfuehrer": 1,
      "mannschaft": 2
    },
    "fahrzeuge": [
      "Führungskraftwagen"
    ]
  },
  {
    "id": "fgr-f",
    "titel": "(FGr F)",
    "quelldatei": "10-04 StAN F-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 3,
      "mannschaft": 4
    },
    "fahrzeuge": [
      "Führungs- und Kommunikationskraftwagen",
      "Anhänger Führung und Lage"
    ]
  },
  {
    "id": "fgr-k-a",
    "titel": "(FGr K (A))",
    "quelldatei": "10-05a StAN K (A)-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 3,
      "mannschaft": 6
    },
    "fahrzeuge": [
      "Fernmeldekraftwagen",
      "Mannschaftstransportwagen Fachgruppe",
      "Anhänger mit Spezialaufbau für FGr K (1 t Nutzlast)",
      "Anhänger (2 t Nutzlast)"
    ]
  },
  {
    "id": "fgr-k-b",
    "titel": "(FGr K (B))",
    "quelldatei": "10-05b StAN K (B)-bf.pdf",
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 4,
      "mannschaft": 9
    },
    "fahrzeuge": [
      "Fernmeldekraftwagen",
      "Mannschaftstransportwagen Fachgruppe",
      "Anhänger mit Spezialaufbau für FGr K (1 t Nutzlast)",
      "Anhänger (2 t Nutzlast)",
      "Mastkraftwagen",
      "Anhänger Richtfunktechnik (2 t Nutzlast)"
    ]
  },
  {
    "id": "stab",
    "titel": "(Stab)",
    "quelldatei": "10-06 StAN Stab-bf.pdf"
  },
  {
    "id": "anschreiben-stan",
    "titel": "Anschreiben StAN",
    "quelldatei": "Anschreiben StAN.pdf"
  }
] as const;
