#!/usr/bin/env node
// Einziger Ort in @s1/cli, der `process` anfasst.
import process from "node:process";

import { fuehreAus } from "./index.js";

const ergebnis = await fuehreAus(process.argv.slice(2));
process.stdout.write(`${ergebnis.text}\n`);
process.exitCode = ergebnis.code;
