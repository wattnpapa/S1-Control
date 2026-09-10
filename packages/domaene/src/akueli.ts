/**
 * Die Abkürzungsliste — das Blatt „AküLi“ der Excel (M3.6).
 *
 * In der Vorlage ist es ein `veryHidden`-Blatt mit der Tabelle
 * `AküLi_Tabelle` (A1:B111), das Strg+H als Formular öffnet
 * (Bestandsaufnahme `excel-domaenenmodell.md` §6). Es ist kein Beiwerk: Eine
 * Führungsstelle bekommt Meldungen mit Kürzeln, die niemand am Tisch
 * auswendig kennt, und schlägt sie im laufenden Betrieb nach.
 *
 * **Sie liegt in Ring 2 und nicht im Renderer**, obwohl nur eine Ansicht sie
 * zeigt. Es sind fachliche Referenzdaten wie der STAN-Datensatz und die
 * Vorlagenkataloge; sie werden gepflegt, sie werden künftig auch gedruckt
 * (M4), und eine Liste, die in einer `.tsx` steht, ist von dort nicht mehr
 * herauszubekommen.
 *
 * **Unverändert übernommen.** Die Schreibweisen sind die der Excel,
 * einschliesslich ihrer Eigenheiten („Einsatz Leit Wagen 2“, „GE SFM“ mit
 * wiederholtem Kürzel in der Bedeutung). Sie hier stillschweigend zu glätten
 * hiesse, den Vergleich mit der Referenzlage (Entscheidung 8) an einer
 * Stelle zu brechen, an der niemand ihn sucht.
 */

/** Die beiden Abschnitte des Blatts (§6.1 und §6.2). */
export type Akuegruppe = "EINHEITEN" | "FAHRZEUGE_UND_GERAETE";

export interface Akueeintrag {
  readonly kuerzel: string;
  readonly bedeutung: string;
  readonly gruppe: Akuegruppe;
}

const e = (kuerzel: string, bedeutung: string, gruppe: Akuegruppe): Akueeintrag => ({
  kuerzel,
  bedeutung,
  gruppe,
});

/** Die Abkürzungsliste, in der Reihenfolge des Blatts. */
export const AKUELI: readonly Akueeintrag[] = [
  e("FM Veg", "Fachmodul Vegetationsbrandbekämpfung", "EINHEITEN"),
  e("FGr VersES", "Fachgruppe Versorgung und Eigenschutz", "EINHEITEN"),
  e("FM Hfs", "Fachmodul Hochleistungsförderpumpensystem", "EINHEITEN"),
  e("FüGr FB Nds", "Führungsgruppe Feuerwehrbereitschaft Nds", "EINHEITEN"),
  e("FZ BS", "Fachzug Brandschutz", "EINHEITEN"),
  e("FZ TH", "Fachzug Technische Hilfe", "EINHEITEN"),
  e("FZ VegBBK", "Fachzug Vegetationsbrandbekämpfung", "EINHEITEN"),
  e("FZ WT", "Fachzug Wassertransport", "EINHEITEN"),
  e("GE MobHWS", "Geräteeinheit mobiles Hochwasserschutzsystem", "EINHEITEN"),
  e("GE SFM", "Geräteeinheit Sandsackfüllmaschine (GE SFM)", "EINHEITEN"),
  e("Gr BT", "Gruppe Betreuung", "EINHEITEN"),
  e("Gr EV", "Gruppe Energieversorgung", "EINHEITEN"),
  e("Gr Fü", "Gruppe Führung", "EINHEITEN"),
  e("Gr LT", "Gruppe Logistik und Technik", "EINHEITEN"),
  e("Gr San", "Gruppe Sanitätsversorgung", "EINHEITEN"),
  e("Gr STau", "Gruppe Spezial Tauchen", "EINHEITEN"),
  e("Gr Tau", "Gruppe Einsatz Tauchen", "EINHEITEN"),
  e("Gr Vpf", "Gruppe Verpflegung", "EINHEITEN"),
  e("Gr WR", "Gruppe Wasserrettung", "EINHEITEN"),
  e("GTr W", "Gerätetrupp Wassergefahren", "EINHEITEN"),
  e("LG", "Löschgruppe", "EINHEITEN"),
  e("St BtL", "Staffel Betreuungstransport- und -leitung", "EINHEITEN"),
  e("St Log Schlauch", "Staffel Logistik Schlauch", "EINHEITEN"),
  e("St Log WT", "Staffel Logistik Wassertransport", "EINHEITEN"),
  e("St PSNV", "Staffel Psychosoziale Notfallversorgung", "EINHEITEN"),
  e("St PT", "Staffel Patiententransport", "EINHEITEN"),
  e("St Reg", "Staffel Registrierung", "EINHEITEN"),
  e("St StrWR", "Staffel Strömungswasserrettung", "EINHEITEN"),
  e("St WR", "Staffel Wasserrettung", "EINHEITEN"),
  e("StLog WE", "Staffel Logistik Wasserentnahme", "EINHEITEN"),
  e("Tr Akl", "Trupp Aufklärung Luft", "EINHEITEN"),
  e("TR L", "Trupp Logistik schwer", "EINHEITEN"),
  e("Tr Log Schlauch", "Trupp Logistik Schlauch", "EINHEITEN"),
  e("Tr LogFü", "Trupp Logistik Führung", "EINHEITEN"),
  e("Tr ML", "Trupp Melde- und Lotsen", "EINHEITEN"),
  e("Tr T", "Trupp Transport Bus 50", "EINHEITEN"),
  e("Tr TH", "Trupp Technische Hilfe", "EINHEITEN"),
  e("Tr VegBBK", "Trupp Vegetationsbrandbekämpfung", "EINHEITEN"),
  e("Tr WT", "Trupp Wassertransport", "EINHEITEN"),
  e("Z SB", "Zug Sanität und Betreuung", "EINHEITEN"),
  e("ZTr", "Zugtrupp", "EINHEITEN"),
  e("ZTr WR", "Zugtrupp Wasserrettung", "EINHEITEN"),
  e("AB HFS", "Abrollbehälter mit Hochleistungsförderpumpensystem", "FAHRZEUGE_UND_GERAETE"),
  e("AB Log", "Abrollbehälter Logistik", "FAHRZEUGE_UND_GERAETE"),
  e("AB Mulde", "Abrollbehälter Mulde", "FAHRZEUGE_UND_GERAETE"),
  e("AB Veg", "Abrollbehälter Vegetationsbrandbekämpfung", "FAHRZEUGE_UND_GERAETE"),
  e("Anh", "Anhänger", "FAHRZEUGE_UND_GERAETE"),
  e("Anh Bt", "Anhänger Betreuung", "FAHRZEUGE_UND_GERAETE"),
  e("Anh Kühl", "Kühlanhänger", "FAHRZEUGE_UND_GERAETE"),
  e("Anh Log", "Anhänger für Logistikzwecke", "FAHRZEUGE_UND_GERAETE"),
  e("Anh Tank", "Anhänger mobile Kraftstoffversorgung", "FAHRZEUGE_UND_GERAETE"),
  e("Anh Trsp", "Anhänger zum Transport", "FAHRZEUGE_UND_GERAETE"),
  e("Anh Zelt", "Anhänger Zelt", "FAHRZEUGE_UND_GERAETE"),
  e("DLK 23/12", "Drehleiter Korb, Rettungshöhe 23 m, Ausladung 12 m", "FAHRZEUGE_UND_GERAETE"),
  e("ELW 1", "Einsatzleitwagen 1", "FAHRZEUGE_UND_GERAETE"),
  e("ELW 2", "Einsatz Leit Wagen 2", "FAHRZEUGE_UND_GERAETE"),
  e("FKH", "Feldkochherd", "FAHRZEUGE_UND_GERAETE"),
  e("FüKw", "Führungs Kraftwagen", "FAHRZEUGE_UND_GERAETE"),
  e("GW Bt", "Gerätewagen Betreuungsdienst", "FAHRZEUGE_UND_GERAETE"),
  e("GW L 7,5", "Gerätewagen Logistik „7,5“", "FAHRZEUGE_UND_GERAETE"),
  e("GW L Gr", "Gerätewagen Logistik groß", "FAHRZEUGE_UND_GERAETE"),
  e("GW L kl", "Gerätewagen Logistik klein", "FAHRZEUGE_UND_GERAETE"),
  e("GW San", "Gerätewagen Sanitätsdienst", "FAHRZEUGE_UND_GERAETE"),
  e("GW SpTau", "Gerätewagen Spezialtauchen", "FAHRZEUGE_UND_GERAETE"),
  e("GW Tau", "Gerätewagen Tauchen", "FAHRZEUGE_UND_GERAETE"),
  e("GW Vpf", "Gerätewagen Verpflegung", "FAHRZEUGE_UND_GERAETE"),
  e("GW WGT", "Gerätewagen Wassergefahren / Technik", "FAHRZEUGE_UND_GERAETE"),
  e("GW-L1 Vpf", "Gerätewagen Logistik 1 Verpflegung", "FAHRZEUGE_UND_GERAETE"),
  e("GW-L1BTrMt", "Gerätewagen Logistik 1 Betriebsmittel", "FAHRZEUGE_UND_GERAETE"),
  e("GW-L2", "Gerätewagen Logistik 2", "FAHRZEUGE_UND_GERAETE"),
  e("GW-L2 HFS", "Gerätewagen-Logistik 2 mit Hochleistungsförderpumpensystem", "FAHRZEUGE_UND_GERAETE"),
  e("GW-L2 SW", "Gerätewagen Logistik 2 Schlauch", "FAHRZEUGE_UND_GERAETE"),
  e("GW-L2 TH", "Gerätewagen Logistik 2 Technische Hilfe", "FAHRZEUGE_UND_GERAETE"),
  e("GW-L2 Vers", "Gerätewagen Logistik 2 Versorgung", "FAHRZEUGE_UND_GERAETE"),
  e("GW-Str", "Gerätewagen Strömungsrettung", "FAHRZEUGE_UND_GERAETE"),
  e("GW-WR", "Gerätewagen Wasserrettung", "FAHRZEUGE_UND_GERAETE"),
  e("HWB", "Hochwasserschutzboot", "FAHRZEUGE_UND_GERAETE"),
  e("KdoW", "Kommando Wagen", "FAHRZEUGE_UND_GERAETE"),
  e("KOM", "Kraft Omnibus", "FAHRZEUGE_UND_GERAETE"),
  e("Kombi UAV", "Kombinationskraftwagen Unbemanntes Luftfahrzeug", "FAHRZEUGE_UND_GERAETE"),
  e("Kombi-L", "Kombinationskraftwagen Logistik", "FAHRZEUGE_UND_GERAETE"),
  e("Krad", "Kraftrad", "FAHRZEUGE_UND_GERAETE"),
  e("KTW", "Kranken Transport Wagen", "FAHRZEUGE_UND_GERAETE"),
  e("LF 20/16", "Löschfahrzeug 20/16 (2000 ltr/min, 1600 ltr Tank)", "FAHRZEUGE_UND_GERAETE"),
  e("LF KatS", "Löschgruppenfahrzeug Katastrophenschutz", "FAHRZEUGE_UND_GERAETE"),
  e("LKW K", "Lastkraftwagen Kipper", "FAHRZEUGE_UND_GERAETE"),
  e("LZ FW", "Löschzug Feuerwehr", "FAHRZEUGE_UND_GERAETE"),
  e("Mat Cont", "Materialcontainer", "FAHRZEUGE_UND_GERAETE"),
  e("MTW", "Mannschaft Transport Wagen", "FAHRZEUGE_UND_GERAETE"),
  e("MTW Bt", "Mannschaft Transport Wagen Betreuung", "FAHRZEUGE_UND_GERAETE"),
  e("MTW Vpf", "Mannschaftstransportwagen Verpflegung", "FAHRZEUGE_UND_GERAETE"),
  e("MTWm", "Mannschaftstransportwagen multifunktional", "FAHRZEUGE_UND_GERAETE"),
  e("MZB KatS", "Mehrzweckboot Katastrophenschutz", "FAHRZEUGE_UND_GERAETE"),
  e("NEA 250", "Netzersatzanlage 250 kVA", "FAHRZEUGE_UND_GERAETE"),
  e("NEA LiMa", "Netzersatzanlage mit Lichtmast", "FAHRZEUGE_UND_GERAETE"),
  e("Raft", "Schlauchboot", "FAHRZEUGE_UND_GERAETE"),
  e("RTW", "Rettungswagen", "FAHRZEUGE_UND_GERAETE"),
  e("RW", "Rüstwagen", "FAHRZEUGE_UND_GERAETE"),
  e("SMF", "Sandsackfüllmaschine, elektromechanisch", "FAHRZEUGE_UND_GERAETE"),
  e("SW KatS", "Schlauchwagen Katastrophenschutz", "FAHRZEUGE_UND_GERAETE"),
  e("TB KS 6000 L", "mobiler Tankbehälter Kraftstoff 6000 Liter", "FAHRZEUGE_UND_GERAETE"),
  e("TLF 16/25", "Tank Löschfahrzeug 16/25 (1600 ltr/min, 2500 ltr Tank)", "FAHRZEUGE_UND_GERAETE"),
  e("TLF 2000", "Tanklöschfahrzeug 2000", "FAHRZEUGE_UND_GERAETE"),
  e("TLF 3000", "Tanklöschfahrzeug 3000", "FAHRZEUGE_UND_GERAETE"),
  e("TSF", "Tragkraftspritzen Fahrzeug", "FAHRZEUGE_UND_GERAETE"),
  e("UslG", "Umschlaggerät", "FAHRZEUGE_UND_GERAETE"),
  e("WLF", "Wechsellader Fahrzeug", "FAHRZEUGE_UND_GERAETE"),
  e("ZTrKw", "Zugtruppkraftwagen", "FAHRZEUGE_UND_GERAETE"),
];

/**
 * Sucht in Kürzel und Bedeutung, ohne Rücksicht auf Groß- und
 * Kleinschreibung.
 *
 * Beides und nicht nur das Kürzel: Wer „Schlauch“ eintippt, sucht das Kürzel
 * zu einem Wort, das er kennt — der häufigere Fall am Meldekopf. Sortiert
 * wird dabei nicht: Treffer im Kürzel stehen zuerst, weil ein Kürzel, das
 * genau passt, fast immer das Gesuchte ist.
 */
export function sucheAkueli(text: string): readonly Akueeintrag[] {
  const suche = text.trim().toLocaleLowerCase("de-DE");
  if (suche === "") return AKUELI;
  const imKuerzel: Akueeintrag[] = [];
  const inDerBedeutung: Akueeintrag[] = [];
  for (const eintrag of AKUELI) {
    if (eintrag.kuerzel.toLocaleLowerCase("de-DE").includes(suche)) imKuerzel.push(eintrag);
    else if (eintrag.bedeutung.toLocaleLowerCase("de-DE").includes(suche)) inDerBedeutung.push(eintrag);
  }
  return [...imKuerzel, ...inDerBedeutung];
}
