#!/usr/bin/env node
// Reads NID_DELP_Carteira_Projetos_BI.xlsx and emits JSON fixtures to public/data
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import xlsx from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'public', 'data');

const XLSX_PATH =
  process.env.XLSX_PATH ||
  'c:/Users/henrique.emiliano/OneDrive - Delp/NÚCLEO DE INOVAÇÃO DELP - DOCUMENTAÇÃO PROJETOS/SOFTWARE & SAAS/NID SITE/NID_DELP_Carteira_Projetos_BI.xlsx';

if (!existsSync(XLSX_PATH)) {
  console.error(`[seed] xlsx not found at: ${XLSX_PATH}`);
  console.error(`[seed] set XLSX_PATH env var or move file`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
const wb = xlsx.readFile(XLSX_PATH, { cellDates: true });
console.log(`[seed] sheets: ${wb.SheetNames.join(', ')}`);

const sheetToJson = (name) => {
  const ws = wb.Sheets[name];
  return ws ? xlsx.utils.sheet_to_json(ws, { defval: null, raw: false }) : [];
};

const findSheet = (patterns) =>
  wb.SheetNames.find((n) => patterns.some((p) => n.toLowerCase().includes(p)));

const projSheet = findSheet(['projeto', 'carteira', 'bi']);
const memSheet = findSheet(['membro', 'nucleo', 'núcleo', 'equipe']);

const projetos = projSheet ? sheetToJson(projSheet) : [];
const membros = memSheet ? sheetToJson(memSheet) : [];

// Raw dumps for now; shape/normalize in Phase 2 once we inspect columns
writeFileSync(join(OUT, 'projetos.json'), JSON.stringify(projetos, null, 2));
writeFileSync(join(OUT, 'membros.json'), JSON.stringify(membros, null, 2));
writeFileSync(
  join(OUT, 'sheets.json'),
  JSON.stringify({ all: wb.SheetNames, projSheet, memSheet }, null, 2),
);

// Static defaults for Phase 1
const unidades = [
  { slug: 'vespasiano', nome: 'Vespasiano · MG', lat: -19.69, lng: -43.92, ativa: true },
  { slug: 'porto-acu', nome: 'Porto do Açu · RJ', lat: -21.83, lng: -41.0, ativa: false },
  { slug: 'houston', nome: 'Houston · EUA', lat: 29.76, lng: -95.37, ativa: false },
];
writeFileSync(join(OUT, 'unidades.json'), JSON.stringify(unidades, null, 2));

console.log(`[seed] OK — ${projetos.length} projetos, ${membros.length} membros → ${OUT}`);
