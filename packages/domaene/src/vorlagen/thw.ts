/**
 * THW-Vorlagen, erzeugt aus dem StAN-Datensatz (`../stan/daten.ts`).
 *
 * Die taktische Ebene ist aus dem Titel abgeleitet — dieselbe Heuristik, die
 * der Erfassungsbogen als `ebeneVon()` fuehrt und die Zieldatenmodell §2.8
 * Nr. 3 ausdruecklich als **Vorbelegungsregel** uebernimmt, nicht als
 * Speicherlogik. Wo sie nicht greift, steht `UNBESTIMMT` statt eines Ratewerts.
 *
 * Eine Sollstaerke steht nur dort, wo die StAN eine hergibt. v1 fuellte die
 * Luecken mit geratenen Zahlen; das ist in M1.4 entfallen (siehe
 * `../stan/inferenz.ts`).
 */

import type { EinheitVorlage } from "./katalog.js";

/** Die 47 THW-Vorlagen der Excel-Kopiervorlagen (EXH §2.6, Bereich B23). */
export const THW_VORLAGEN: readonly EinheitVorlage[] = [
  {
    "id": "thw-lastkraftwagen-1-5-t-nutzlast-mit-ladekran-780-knm",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "Lastkraftwagen (1,5 t Nutzlast) mit Ladekran (780 kNm)",
    "ebene": "UNBESTIMMT",
    "fahrzeuge": [
      {
        "typ": "Lastkraftwagen (1,5 t Nutzlast) mit Ladekran (780 kNm)",
        "anzahl": 1
      },
      {
        "typ": "LKW Ladekran) ist die Zusatz-funktion Bediener/in Mobilkran o-",
        "anzahl": 1
      }
    ]
  },
  {
    "id": "thw-erganzungsausstattung",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(Ergänzungsausstattung)",
    "ebene": "UNBESTIMMT",
    "fahrzeuge": [
      {
        "typ": "Mannschaftstransportwagen OV",
        "anzahl": 1
      },
      {
        "typ": "Personenkraftwagen OV",
        "anzahl": 1
      },
      {
        "typ": "Gabelstapler (Ergänzungsausstattung)",
        "anzahl": 1
      },
      {
        "typ": "Anhänger 0,5 t Nutzlast",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 2,
      "unterfuehrer": 2,
      "mannschaft": 6
    }
  },
  {
    "id": "thw-mt",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(MT)",
    "ebene": "UNBESTIMMT",
    "fahrzeuge": [
      {
        "typ": "Mannschaftstransportwagen TZ",
        "anzahl": 1
      },
      {
        "typ": "Anhänger mit Spezialaufbau MT (2 t Zuladung)",
        "anzahl": 1
      },
      {
        "typ": "Fahrzeug (PKW, MTW) für die Fahrt zur Einsatzstelle, während des Einsatzes, sowie für die Rückfahrt",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 2,
      "mannschaft": 7
    }
  },
  {
    "id": "thw-vost",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(VOST)",
    "ebene": "UNBESTIMMT",
    "fahrzeuge": [],
    "sollStaerke": {
      "fuehrer": 1,
      "unterfuehrer": 13,
      "mannschaft": 32
    }
  },
  {
    "id": "thw-tz",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "TZ",
    "ebene": "ZUG",
    "fahrzeuge": [
      {
        "typ": "Mannschaftstransportwagen",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 1,
      "unterfuehrer": 1,
      "mannschaft": 2
    }
  },
  {
    "id": "thw-ztr-tz",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(ZTr TZ)",
    "ebene": "ZUGTRUPP",
    "fahrzeuge": [
      {
        "typ": "Führungskraftwagen",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 1,
      "unterfuehrer": 1,
      "mannschaft": 2
    }
  },
  {
    "id": "thw-b",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(B)",
    "ebene": "UNBESTIMMT",
    "fahrzeuge": [
      {
        "typ": "Gerätekraftwagen (7 t Nutzlast)",
        "anzahl": 1
      },
      {
        "typ": "Anhänger Plane/Spriegel mit Aufnahmen für Container",
        "anzahl": 1
      },
      {
        "typ": "Anhänger Plattform Runge (12 t Zuladung)",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 2,
      "mannschaft": 10
    }
  },
  {
    "id": "thw-fgr-r-a",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(FGr R (A))",
    "ebene": "GRUPPE",
    "fahrzeuge": [
      {
        "typ": "Lastkraftwagen Kipper (ca. 9 t Zuladung)",
        "anzahl": 1
      },
      {
        "typ": "Anhänger Tieflader mit Aufnahmen für Container",
        "anzahl": 1
      },
      {
        "typ": "Anhänger Drucklufterzeuger",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 2,
      "mannschaft": 7
    }
  },
  {
    "id": "thw-fgr-r-b",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(FGr R (B))",
    "ebene": "GRUPPE",
    "fahrzeuge": [
      {
        "typ": "Lastkraftwagen Kipper (ca. 9 t Zuladung)",
        "anzahl": 1
      },
      {
        "typ": "Anhänger Tieflader mit Aufnahmen für Container",
        "anzahl": 1
      },
      {
        "typ": "Anhänger Drucklufterzeuger",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 2,
      "mannschaft": 7
    }
  },
  {
    "id": "thw-fgr-r-c",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(FGr R (C))",
    "ebene": "GRUPPE",
    "fahrzeuge": [
      {
        "typ": "Lastkraftwagen Kipper (ca. 9 t Zuladung)",
        "anzahl": 1
      },
      {
        "typ": "Anhänger Tieflader mit Aufnahmen für Container",
        "anzahl": 1
      },
      {
        "typ": "Anhänger Drucklufterzeuger",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 2,
      "mannschaft": 7
    }
  },
  {
    "id": "thw-fgr-w-a",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(FGr W (A))",
    "ebene": "GRUPPE",
    "fahrzeuge": [
      {
        "typ": "Lastkraftwagen (gf, 7 t Nutzlast) mit Ladekran",
        "anzahl": 1
      },
      {
        "typ": "Anhänger Mehrzweckarbeits-",
        "anzahl": 1
      },
      {
        "typ": "Mehrzweckarbeitsboot",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 3,
      "mannschaft": 9
    }
  },
  {
    "id": "thw-fgr-w-b",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(FGr W (B))",
    "ebene": "GRUPPE",
    "fahrzeuge": [
      {
        "typ": "Lastkraftwagen (gf, 7 t Nutzlast) mit Ladekran",
        "anzahl": 1
      },
      {
        "typ": "Anhänger Plattform mit Aufnahmen für Container",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 3,
      "mannschaft": 9
    }
  },
  {
    "id": "thw-fgr-brb",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(FGr BrB)",
    "ebene": "GRUPPE",
    "fahrzeuge": [
      {
        "typ": "Mehrzweckgerätewagen mit Ladebordwand",
        "anzahl": 1
      },
      {
        "typ": "Anhänger Plattform mit Aufnahmen für Container",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 4,
      "mannschaft": 14
    }
  },
  {
    "id": "thw-fgr-o-a",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(FGr O (A))",
    "ebene": "GRUPPE",
    "fahrzeuge": [
      {
        "typ": "Mannschaftstransportwagen TZ",
        "anzahl": 1
      },
      {
        "typ": "Anhänger mit Spezialaufbau FGr O (2 t Zuladung)",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 2,
      "mannschaft": 7
    }
  },
  {
    "id": "thw-fgr-o-b",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(FGr O (B))",
    "ebene": "GRUPPE",
    "fahrzeuge": [
      {
        "typ": "Mannschaftstransportwagen TZ",
        "anzahl": 1
      },
      {
        "typ": "Anhänger mit Spezialaufbau FGr O (2 t Zuladung)",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 2,
      "mannschaft": 7
    }
  },
  {
    "id": "thw-fgr-o-c",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(FGr O (C))",
    "ebene": "GRUPPE",
    "fahrzeuge": [
      {
        "typ": "Mannschaftstransportwagen TZ",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 2,
      "mannschaft": 4
    }
  },
  {
    "id": "thw-fgr-sp",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(FGr Sp)",
    "ebene": "GRUPPE",
    "fahrzeuge": [
      {
        "typ": "Mannschaftstransportwagen FGr",
        "anzahl": 1
      },
      {
        "typ": "Anhänger mit Spezialaufbau FGr Sp (2 t Zuladung)",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 2,
      "mannschaft": 4
    }
  },
  {
    "id": "thw-fgr-n",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(FGr N)",
    "ebene": "GRUPPE",
    "fahrzeuge": [
      {
        "typ": "Mehrzweckgerätewagen Plane/Spriegel mit Ladebordwand",
        "anzahl": 1
      },
      {
        "typ": "Gabelstapler (mind. 3 t Hubkraft)",
        "anzahl": 1
      },
      {
        "typ": "Kleines Boot",
        "anzahl": 1
      },
      {
        "typ": "Anhänger kleines Boot",
        "anzahl": 1
      },
      {
        "typ": "Anhänger Plattform mit Aufnahmen für Container",
        "anzahl": 1
      },
      {
        "typ": "Anhänger Netzersatzanlage mit Lichtmastanlage",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 2,
      "mannschaft": 7
    }
  },
  {
    "id": "thw-seeba",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "SEEBA",
    "ebene": "UNBESTIMMT",
    "fahrzeuge": [
      {
        "typ": "3/9/0/12 Personenkraftwagen,",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 3,
      "unterfuehrer": 12,
      "mannschaft": 6
    }
  },
  {
    "id": "thw-fgr-sb-a",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(FGr SB (A))",
    "ebene": "GRUPPE",
    "fahrzeuge": [
      {
        "typ": "Mehrzweckgerätewagen Plane/Spriegel mit Ladebordwand",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 3,
      "mannschaft": 9
    }
  },
  {
    "id": "thw-fgr-sb-b",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(FGr SB (B))",
    "ebene": "GRUPPE",
    "fahrzeuge": [
      {
        "typ": "Mehrzweckgerätewagen Plane/Spriegel mit Ladebordwand",
        "anzahl": 1
      },
      {
        "typ": "Anhänger Plattform mit Aufnahmen für Container",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 3,
      "mannschaft": 9
    }
  },
  {
    "id": "thw-tr-ess",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(Tr ESS)",
    "ebene": "TRUPP",
    "fahrzeuge": [
      {
        "typ": "Mannschaftstransportwagen TZ",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 1,
      "mannschaft": 3
    }
  },
  {
    "id": "thw-tr-mhp",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(Tr MHP)",
    "ebene": "TRUPP",
    "fahrzeuge": [
      {
        "typ": "Mannschaftstransportwagen (geländegängig)",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 1,
      "mannschaft": 3
    }
  },
  {
    "id": "thw-tr-ul",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(Tr UL)",
    "ebene": "TRUPP",
    "fahrzeuge": [
      {
        "typ": "Mannschaftstransportwagen TZ",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 1,
      "mannschaft": 3
    }
  },
  {
    "id": "thw-fgr-bt",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(FGr BT)",
    "ebene": "GRUPPE",
    "fahrzeuge": [
      {
        "typ": "Mannschaftslastwagen IV Plane/Spriegel mit Ladebordwand",
        "anzahl": 1
      },
      {
        "typ": "Anhänger",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 2,
      "mannschaft": 7
    }
  },
  {
    "id": "thw-fgr-i",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(FGr I)",
    "ebene": "GRUPPE",
    "fahrzeuge": [
      {
        "typ": "Mannschaftslastwagen IV Plane/Spriegel mit Ladebordwand",
        "anzahl": 1
      },
      {
        "typ": "Mannschaftstransportwagen FGr",
        "anzahl": 1
      },
      {
        "typ": "Anhänger mit Spezialaufbau für FGr I (2 t Nutzlast)",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 3,
      "mannschaft": 9
    }
  },
  {
    "id": "thw-fgr-e",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(FGr E)",
    "ebene": "GRUPPE",
    "fahrzeuge": [
      {
        "typ": "Lastkraftwagen Plane/Spriegel mit Ladebordwand",
        "anzahl": 1
      },
      {
        "typ": "Anhänger Netzersatzanlage (ca. 200 kVA)",
        "anzahl": 1
      },
      {
        "typ": "Anhänger Netzersatzanlage (ca. 650 kVA)",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 2,
      "mannschaft": 7
    }
  },
  {
    "id": "thw-fgr-tw",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(FGr TW)",
    "ebene": "GRUPPE",
    "fahrzeuge": [
      {
        "typ": "Lastkraftwagen Plane/Spriegel mit Ladebordwand",
        "anzahl": 1
      },
      {
        "typ": "Anhänger Trinkwasseraufbereitungsanlage",
        "anzahl": 1
      },
      {
        "typ": "Stapler (2 t Hubkraft, geländefähig)",
        "anzahl": 1
      },
      {
        "typ": "Anhänger BDF Lafette",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 3,
      "mannschaft": 15
    }
  },
  {
    "id": "thw-fgr-wp-a",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(FGr WP (A))",
    "ebene": "GRUPPE",
    "fahrzeuge": [
      {
        "typ": "Lastkraftwagen Plane/Spriegel mit Ladebordwand",
        "anzahl": 1
      },
      {
        "typ": "Mannschaftslastwagen IV Plane/Spriegel mit Ladebordwand",
        "anzahl": 1
      },
      {
        "typ": "Anhänger mit Schmutzwasser-Kreiselpumpe",
        "anzahl": 1
      },
      {
        "typ": "Anhänger Plane/Spriegel mit Aufnahmen für Container",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 3,
      "mannschaft": 9
    }
  },
  {
    "id": "thw-fgr-wp-b",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(FGr WP (B))",
    "ebene": "GRUPPE",
    "fahrzeuge": [
      {
        "typ": "Lastkraftwagen Plane/Spriegel mit Ladebordwand",
        "anzahl": 1
      },
      {
        "typ": "Mannschaftslastwagen IV Plane/Spriegel mit Ladebordwand",
        "anzahl": 1
      },
      {
        "typ": "Anhänger mit Schmutzwasser-Kreiselpumpe",
        "anzahl": 1
      },
      {
        "typ": "Anhänger Plane/Spriegel mit Aufnahmen für Container",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 3,
      "mannschaft": 9
    }
  },
  {
    "id": "thw-fgr-wp-c",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(FGr WP (C))",
    "ebene": "GRUPPE",
    "fahrzeuge": [
      {
        "typ": "Lastkraftwagen Plane/Spriegel mit Ladebordwand",
        "anzahl": 1
      },
      {
        "typ": "Mannschaftslastwagen IV Plane/Spriegel mit Ladebordwand",
        "anzahl": 1
      },
      {
        "typ": "Anhänger mit Schmutzwasser-Kreiselpumpe",
        "anzahl": 1
      },
      {
        "typ": "Anhänger Plane/Spriegel mit Aufnahmen für Container",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 3,
      "mannschaft": 9
    }
  },
  {
    "id": "thw-fgr-ol-a",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(FGr Öl (A))",
    "ebene": "GRUPPE",
    "fahrzeuge": [
      {
        "typ": "Lastkraftwagen Wechsellader",
        "anzahl": 1
      },
      {
        "typ": "Lastkraftwagen (7 t Nutzlast) mit Ladekran",
        "anzahl": 1
      },
      {
        "typ": "Anhänger Plattform mit Aufnahmen für Container",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 4,
      "mannschaft": 14
    }
  },
  {
    "id": "thw-fgr-ol-b",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(FGr Öl (B))",
    "ebene": "GRUPPE",
    "fahrzeuge": [
      {
        "typ": "Lastkraftwagen Wechsellader",
        "anzahl": 1
      },
      {
        "typ": "Lastkraftwagen (9 t Nutzlast) mit Ladekran",
        "anzahl": 1
      },
      {
        "typ": "Anhänger Plattform mit Aufnahmen für Container",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 4,
      "mannschaft": 14
    }
  },
  {
    "id": "thw-fgr-ol-c",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(FGr Öl (C))",
    "ebene": "GRUPPE",
    "fahrzeuge": [
      {
        "typ": "Lastkraftwagen Wechsellader",
        "anzahl": 1
      },
      {
        "typ": "Stapler (3 t Hubkraft, geländefähig)",
        "anzahl": 1
      },
      {
        "typ": "Anhänger Plattform mit Aufnahmen für Container",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 4,
      "mannschaft": 14
    }
  },
  {
    "id": "thw-die-seewa-ist-gebietsma-ig-bundesweit-in-3-module-mit-jeweils-einer-fachgruppe-als",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "Die SEEWA ist gebietsmäßig bundesweit in 3 Module mit jeweils einer Fachgruppe als",
    "ebene": "GRUPPE",
    "fahrzeuge": [
      {
        "typ": "Anhänger 2 t, Plane/Spriegel",
        "anzahl": 1
      },
      {
        "typ": "Anhänger 1,6 t, Kofferaufbau",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 1,
      "unterfuehrer": 2,
      "mannschaft": 10
    }
  },
  {
    "id": "thw-ent",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(ENT)",
    "ebene": "UNBESTIMMT",
    "fahrzeuge": [],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 3,
      "mannschaft": 11
    }
  },
  {
    "id": "thw-3-1-seelift",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "3.1 SEElift",
    "ebene": "UNBESTIMMT",
    "fahrzeuge": [
      {
        "typ": "Personenkraftwagen Kombi",
        "anzahl": 1
      },
      {
        "typ": "Mannschaftstransportwagen",
        "anzahl": 1
      },
      {
        "typ": "Anhänger 0,6 t",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 5,
      "unterfuehrer": 2,
      "mannschaft": 6
    }
  },
  {
    "id": "thw-ztr-fz-log",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(ZTr FZ Log)",
    "ebene": "ZUGTRUPP",
    "fahrzeuge": [
      {
        "typ": "Führungskraftwagen",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 1,
      "unterfuehrer": 1,
      "mannschaft": 2
    }
  },
  {
    "id": "thw-fgr-log-mw",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(FGr Log-MW)",
    "ebene": "GRUPPE",
    "fahrzeuge": [
      {
        "typ": "LKW (gf), Ladekran",
        "anzahl": 1
      },
      {
        "typ": "Anhänger Plattform",
        "anzahl": 1
      },
      {
        "typ": "PKW (gl)",
        "anzahl": 1
      },
      {
        "typ": "Anhänger mit Spezialaufbau für FGr Log-MW",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 3,
      "mannschaft": 9
    }
  },
  {
    "id": "thw-fgr-log-v",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(FGr Log-V)",
    "ebene": "GRUPPE",
    "fahrzeuge": [
      {
        "typ": "Lastkraftwagen mit Ladebordwand",
        "anzahl": 1
      },
      {
        "typ": "Mannschaftstransportwagen FGr",
        "anzahl": 1
      },
      {
        "typ": "Anhänger 12t, Koffer, ohne Flurförderzeug be- und entladbar",
        "anzahl": 1
      },
      {
        "typ": "Anhänger mit Spezialaufbau für FGr Log-V, Kühl",
        "anzahl": 1
      },
      {
        "typ": "Bei dieser Alternative werden die Module des FKH, wo dies möglich ist, auf den Anhänger 12to verla-",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 3,
      "mannschaft": 9
    }
  },
  {
    "id": "thw-tr-ts",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(Tr TS)",
    "ebene": "TRUPP",
    "fahrzeuge": [],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 1,
      "mannschaft": 3
    }
  },
  {
    "id": "thw-sys-br500",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "Sys BR500",
    "ebene": "UNBESTIMMT",
    "fahrzeuge": []
  },
  {
    "id": "thw-ztr-fz-fk",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(ZTr FZ FK)",
    "ebene": "ZUGTRUPP",
    "fahrzeuge": [
      {
        "typ": "Führungskraftwagen",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 1,
      "unterfuehrer": 1,
      "mannschaft": 2
    }
  },
  {
    "id": "thw-fgr-f",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(FGr F)",
    "ebene": "GRUPPE",
    "fahrzeuge": [
      {
        "typ": "Führungs- und Kommunikationskraftwagen",
        "anzahl": 1
      },
      {
        "typ": "Anhänger Führung und Lage",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 3,
      "mannschaft": 4
    }
  },
  {
    "id": "thw-fgr-k-a",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(FGr K (A))",
    "ebene": "GRUPPE",
    "fahrzeuge": [
      {
        "typ": "Fernmeldekraftwagen",
        "anzahl": 1
      },
      {
        "typ": "Mannschaftstransportwagen Fachgruppe",
        "anzahl": 1
      },
      {
        "typ": "Anhänger mit Spezialaufbau für FGr K (1 t Nutzlast)",
        "anzahl": 1
      },
      {
        "typ": "Anhänger (2 t Nutzlast)",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 3,
      "mannschaft": 6
    }
  },
  {
    "id": "thw-fgr-k-b",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(FGr K (B))",
    "ebene": "GRUPPE",
    "fahrzeuge": [
      {
        "typ": "Fernmeldekraftwagen",
        "anzahl": 1
      },
      {
        "typ": "Mannschaftstransportwagen Fachgruppe",
        "anzahl": 1
      },
      {
        "typ": "Anhänger mit Spezialaufbau für FGr K (1 t Nutzlast)",
        "anzahl": 1
      },
      {
        "typ": "Anhänger (2 t Nutzlast)",
        "anzahl": 1
      },
      {
        "typ": "Mastkraftwagen",
        "anzahl": 1
      },
      {
        "typ": "Anhänger Richtfunktechnik (2 t Nutzlast)",
        "anzahl": 1
      }
    ],
    "sollStaerke": {
      "fuehrer": 0,
      "unterfuehrer": 4,
      "mannschaft": 9
    }
  },
  {
    "id": "thw-stab",
    "katalog": "THW_STAN",
    "katalogVersion": "2026-07-01",
    "organisation": "THW",
    "bezeichnung": "(Stab)",
    "ebene": "UNBESTIMMT",
    "fahrzeuge": []
  }
] as const;
