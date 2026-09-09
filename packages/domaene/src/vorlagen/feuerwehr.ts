/**
 * Feuerwehr-Vorlagen aus dem zweiten Kopiervorlagen-Bereich der Excel
 * (EXH §2.6, Blatt Staerke B73: „Kopiervorlagen KatS-StAN Nds und Feuerwehr").
 *
 * Die Excel fuehrt dort einen Loeschzug mit vier Gliederungen und je einem
 * Fahrzeug. Mehr gibt die Quelle nicht her: **Sollstaerken stehen dort nicht**,
 * und sie werden hier nicht erfunden — dieselbe Regel wie beim STAN-Datensatz.
 *
 * Der dritte Katalog `KATS_STAN_NDS` (Excel `Staerke!C83:C121` mit Fahrzeugen
 * in Spalte J) fehlt: Seine 39 Zeilen sind in der Bestandsaufnahme nur als
 * Bereichsangabe genannt, nicht aufgelistet, und die Arbeitsmappe selbst liegt
 * nicht im Repository. Er ist als offener Punkt gefuehrt (M1.4) und wird aus
 * der Mappe nachgezogen, sobald sie vorliegt. Ein aus der Bereichsangabe
 * geratener Katalog waere genau der Platzhalter, der spaeter wie eine
 * Festlegung aussieht.
 */

import type { EinheitVorlage } from "./katalog.js";

const KATALOG_VERSION = "1.5.0";   // Excel-Fassung, in der die Vorlagen kamen (Neu!B34)

export const FEUERWEHR_VORLAGEN: readonly EinheitVorlage[] = [
  {
    id: "fw-loeschzug",
    katalog: "FEUERWEHR",
    katalogVersion: KATALOG_VERSION,
    organisation: "FEUERWEHR",
    bezeichnung: "LZ FW",
    lang: "Löschzug Feuerwehr",
    ebene: "ZUG",
    fahrzeuge: [],
  },
  {
    id: "fw-zugtrupp",
    katalog: "FEUERWEHR",
    katalogVersion: KATALOG_VERSION,
    organisation: "FEUERWEHR",
    bezeichnung: "ZTr",
    lang: "Zugtrupp",
    ebene: "ZUGTRUPP",
    fahrzeuge: [{ typ: "ELW 1", anzahl: 1 }],
    teilVon: "fw-loeschzug",
  },
  {
    id: "fw-loeschgruppe",
    katalog: "FEUERWEHR",
    katalogVersion: KATALOG_VERSION,
    organisation: "FEUERWEHR",
    bezeichnung: "LGr",
    lang: "Löschgruppe",
    ebene: "GRUPPE",
    fahrzeuge: [{ typ: "LF 20/16", anzahl: 1 }],
    teilVon: "fw-loeschzug",
  },
  {
    id: "fw-loeschstaffel",
    katalog: "FEUERWEHR",
    katalogVersion: KATALOG_VERSION,
    organisation: "FEUERWEHR",
    bezeichnung: "LSt",
    lang: "Löschstaffel",
    ebene: "STAFFEL",
    fahrzeuge: [{ typ: "TLF 16/25", anzahl: 1 }],
    teilVon: "fw-loeschzug",
  },
  {
    id: "fw-loeschtrupp",
    katalog: "FEUERWEHR",
    katalogVersion: KATALOG_VERSION,
    organisation: "FEUERWEHR",
    bezeichnung: "LTr",
    lang: "Löschtrupp",
    ebene: "TRUPP",
    fahrzeuge: [{ typ: "DLK 23/12", anzahl: 1 }],
    teilVon: "fw-loeschzug",
  },
];
