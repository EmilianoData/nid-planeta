'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import './pipeline.css';

type StackKey = 'bi-stack' | 'ia-stack' | 'sw-stack' | 'rpa-stack' | 'erp-stack' | 'gen-stack';

type Tile = {
  top: number;
  left: number;
  width: number;
  bg: string;
  icon: string;
  name: string;
  sub: string;
  delp?: boolean;
  smallName?: boolean;
  stackKey?: StackKey;
};

type Conduit = {
  id: string;
  d: string;
  stroke: string;
  width: number;
  cold?: boolean;
};

type ParticleSpec = {
  pathId: string;
  cls: string;
  r: number;
  dur: number;
  begin?: number;
};

const SOURCES: Tile[] = [
  { top: 80, left: 24, width: 176, bg: 'fluig', icon: 'fluig', name: 'FLUIG', sub: 'Workflows · BPM', delp: true },
  { top: 148, left: 24, width: 176, bg: 'totvs', icon: 'totvs', name: 'TOTVS RM', sub: 'ERP · Master', delp: true },
  { top: 216, left: 24, width: 176, bg: 'sharepoint', icon: 'sharepoint', name: 'SharePoint', sub: 'Docs · Listas · M365', delp: true },
  { top: 284, left: 24, width: 176, bg: 'sql-gray', icon: 'sql', name: 'DB Local Delp', sub: 'SQL · Relational', delp: true },
  { top: 352, left: 24, width: 176, bg: 'azure-data', icon: 'sql', name: 'Azure Data Services', sub: 'Cosmos DB · Dataverse' },
];

const INGEST: Tile[] = [
  { top: 110, left: 230, width: 130, bg: 'azure-blue', icon: 'eventhubs', name: 'Event Hubs', sub: 'Streaming', smallName: true },
  { top: 195, left: 230, width: 130, bg: 'azure-blue', icon: 'iothub', name: 'IoT Hub', sub: 'Telemetry', smallName: true },
];

const FABRIC_INGEST: Tile[] = [
  { top: 153, left: 410, width: 130, bg: 'fabric-purple', icon: 'eventstreams', name: 'Eventstreams', sub: 'Hot · Real-time', smallName: true },
  { top: 223, left: 410, width: 130, bg: 'dataflow', icon: 'datafactory', name: 'Data Factory', sub: 'Cold · Scheduled', smallName: true },
  { top: 295, left: 410, width: 130, bg: 'sql-gray', icon: 'mirror', name: 'Mirroring', sub: 'SQL · Copy Job', smallName: true },
];

const FABRIC_STORAGE: Tile[] = [
  { top: 263, left: 620, width: 130, bg: 'eventhouse', icon: 'eventhouse', name: 'Eventhouse', sub: 'KQL · Real-time', smallName: true },
  { top: 333, left: 620, width: 130, bg: 'lakehouse', icon: 'lakehouse', name: 'Lakehouse', sub: 'Bronze·Silver·Gold', smallName: true },
  { top: 403, left: 620, width: 130, bg: 'mirror', icon: 'mirror', name: 'Mirrored Replica', sub: 'OneLake', smallName: true },
];

const PROCESS_TILES: Tile[] = [
  { top: 193, left: 880, width: 140, bg: 'kql-blue', icon: 'kql', name: 'KQL Queryset', sub: 'Telemetry' },
  { top: 263, left: 880, width: 140, bg: 'spark-orange', icon: 'spark', name: 'Spark Notebook', sub: 'Lakehouse' },
  { top: 333, left: 880, width: 140, bg: 'sql-gray', icon: 'sqlscript', name: 'SQL Scripts', sub: 'T-SQL Warehouse' },
  { top: 403, left: 880, width: 140, bg: 'dataflow', icon: 'dataflow', name: 'Dataflow Gen2', sub: 'Power Query' },
];

const ENRICH: Tile[] = [
  { top: 193, left: 1100, width: 140, bg: 'foundry-pink', icon: 'foundry', name: 'MS Foundry', sub: 'LLM · Agents' },
  { top: 263, left: 1100, width: 140, bg: 'azure-ml', icon: 'azureml', name: 'Azure ML', sub: 'Custom Models' },
];

const SERVE: Tile[] = [
  { top: 193, left: 1300, width: 140, bg: 'pbi-yellow', icon: 'powerbi', name: 'Power BI', sub: '8 Dashboards' },
  { top: 263, left: 1300, width: 140, bg: 'fabric-green', icon: 'dataagent', name: 'Data Agent', sub: 'Conv. AI' },
  { top: 333, left: 1300, width: 140, bg: 'vector-purple', icon: 'vector', name: 'Vector Store', sub: 'RAG · Embeds' },
  { top: 403, left: 1300, width: 140, bg: 'fabric-green', icon: 'fabric', name: 'External Share', sub: 'Curated Sets' },
];

const STACKS: (Tile & { stackKey: StackKey })[] = [
  { stackKey: 'bi-stack', top: 80, left: 1500, width: 175, bg: 'pbi-yellow', icon: 'powerbi', name: 'BI · Eng. Dados', sub: '8 Proj · 4R 2P 1L 1B' },
  { stackKey: 'ia-stack', top: 200, left: 1500, width: 175, bg: 'foundry-pink', icon: 'foundry', name: 'IA · Multiagentes', sub: '3 Proj · 1R 2P' },
  { stackKey: 'sw-stack', top: 320, left: 1500, width: 175, bg: 'vector-purple', icon: 'vector', name: 'Software', sub: '9 Proj · 5R 3P 1L' },
  { stackKey: 'rpa-stack', top: 440, left: 1500, width: 175, bg: 'dataflow', icon: 'dataflow', name: 'RPA · Automações', sub: '6 Proj · 2R 3P 1B' },
  { stackKey: 'erp-stack', top: 560, left: 1500, width: 175, bg: 'totvs', icon: 'totvs', name: 'ERP+ · Melhorias', sub: '4 Proj · 1R 1P 2L' },
  { stackKey: 'gen-stack', top: 680, left: 1500, width: 175, bg: 'sql-gray', icon: 'policy', name: 'Geral · Infra', sub: '5 Proj · 1R 4B' },
];

const CONDUITS: Conduit[] = [
  { id: 'p-fluig-eh', d: 'M 200 100 C 235 100, 235 130, 270 130', stroke: 'g-azure', width: 2.4 },
  { id: 'p-totvs-eh', d: 'M 200 168 C 235 168, 235 145, 270 145', stroke: 'g-azure', width: 2.4 },
  { id: 'p-sp-iot', d: 'M 200 236 C 235 236, 235 215, 270 215', stroke: 'g-azure', width: 2.4 },
  { id: 'p-rdb-mirror', d: 'M 200 304 C 260 304, 280 320, 410 320', stroke: 'g-fabric', width: 2.6 },
  { id: 'p-asd-mirror', d: 'M 200 372 C 260 372, 280 320, 410 320', stroke: 'g-fabric', width: 2.4 },
  { id: 'p-eh-es', d: 'M 360 130 C 395 130, 395 170, 410 170', stroke: 'g-fabric', width: 2.6 },
  { id: 'p-iot-es', d: 'M 360 215 C 395 215, 395 175, 410 175', stroke: 'g-fabric', width: 2.4 },
  { id: 'p-es-eh', d: 'M 540 175 C 580 175, 580 290, 620 290', stroke: 'g-late', width: 2.4 },
  { id: 'p-df-lh', d: 'M 540 245 C 580 245, 580 360, 620 360', stroke: 'g-azure', width: 2.4, cold: true },
  { id: 'p-mr-mirr', d: 'M 540 320 C 580 320, 580 430, 620 430', stroke: 'g-fabric', width: 2.4 },
  { id: 'p-eh-kql', d: 'M 750 290 C 810 290, 830 220, 880 220', stroke: 'g-fabric', width: 2.4 },
  { id: 'p-lh-spark', d: 'M 750 360 C 810 360, 830 290, 880 290', stroke: 'g-fabric', width: 2.6 },
  { id: 'p-lh-sql', d: 'M 750 360 C 810 360, 830 360, 880 360', stroke: 'g-fabric', width: 2.4 },
  { id: 'p-lh-df', d: 'M 750 360 C 810 360, 830 430, 880 430', stroke: 'g-fabric', width: 2.4 },
  { id: 'p-spark-foundry', d: 'M 1020 290 C 1060 290, 1060 220, 1100 220', stroke: 'g-fabric', width: 2.4 },
  { id: 'p-spark-aml', d: 'M 1020 290 C 1060 290, 1060 290, 1100 290', stroke: 'g-fabric', width: 2.4 },
  { id: 'p-sql-pbi', d: 'M 1020 360 C 1100 360, 1180 220, 1300 220', stroke: 'g-running', width: 3 },
  { id: 'p-df-pbi', d: 'M 1020 430 C 1100 430, 1180 220, 1300 220', stroke: 'g-running', width: 2.4 },
  { id: 'p-foundry-agent', d: 'M 1240 220 C 1270 220, 1270 290, 1300 290', stroke: 'g-pending', width: 2.6 },
  { id: 'p-aml-vector', d: 'M 1240 290 C 1270 290, 1270 360, 1300 360', stroke: 'g-pending', width: 2.4 },
  { id: 'p-pbi-bi', d: 'M 1440 220 C 1470 220, 1490 100, 1520 100', stroke: 'g-running', width: 3 },
  { id: 'p-agent-ia', d: 'M 1440 290 C 1470 290, 1490 220, 1520 220', stroke: 'g-pending', width: 2.6 },
  { id: 'p-vector-sw', d: 'M 1440 360 C 1470 360, 1490 340, 1520 340', stroke: 'g-running', width: 2.6 },
  { id: 'p-share-rpa', d: 'M 1440 430 C 1470 430, 1490 460, 1520 460', stroke: 'g-pending', width: 2.4 },
  { id: 'p-back-erp', d: 'M 670 320 C 700 320, 700 580, 1520 580', stroke: 'g-late', width: 2 },
  { id: 'p-share-gen', d: 'M 1440 430 C 1470 430, 1490 700, 1520 700', stroke: 'g-backlog', width: 2 },
];

const PARTICLES: ParticleSpec[] = [
  { pathId: 'p-fluig-eh', cls: 'azure', r: 2.3, dur: 2.8 },
  { pathId: 'p-fluig-eh', cls: 'azure', r: 2.3, dur: 2.8, begin: -1.4 },
  { pathId: 'p-totvs-eh', cls: 'azure', r: 2.3, dur: 3 },
  { pathId: 'p-totvs-eh', cls: 'azure', r: 2.3, dur: 3, begin: -1.5 },
  { pathId: 'p-sp-iot', cls: 'azure', r: 2.3, dur: 3.2 },
  { pathId: 'p-sp-iot', cls: 'azure', r: 2.3, dur: 3.2, begin: -1.6 },
  { pathId: 'p-rdb-mirror', cls: 'fabric', r: 2.3, dur: 3.4 },
  { pathId: 'p-rdb-mirror', cls: 'fabric', r: 2.3, dur: 3.4, begin: -1.7 },
  { pathId: 'p-asd-mirror', cls: 'fabric', r: 2, dur: 4 },
  { pathId: 'p-eh-es', cls: 'fabric', r: 2.3, dur: 2.4 },
  { pathId: 'p-eh-es', cls: 'fabric', r: 2.3, dur: 2.4, begin: -1.2 },
  { pathId: 'p-iot-es', cls: 'fabric', r: 2, dur: 2.6 },
  { pathId: 'p-es-eh', cls: 'late', r: 2.3, dur: 2.2 },
  { pathId: 'p-es-eh', cls: 'late', r: 2.3, dur: 2.2, begin: -1.1 },
  { pathId: 'p-df-lh', cls: 'azure', r: 2, dur: 3.6 },
  { pathId: 'p-df-lh', cls: 'azure', r: 2, dur: 3.6, begin: -1.8 },
  { pathId: 'p-mr-mirr', cls: 'fabric', r: 2, dur: 3 },
  { pathId: 'p-eh-kql', cls: 'fabric', r: 2.3, dur: 2.6 },
  { pathId: 'p-lh-spark', cls: 'fabric', r: 2.3, dur: 2.4 },
  { pathId: 'p-lh-spark', cls: 'fabric', r: 2.3, dur: 2.4, begin: -1.2 },
  { pathId: 'p-lh-sql', cls: 'fabric', r: 2.3, dur: 2.6 },
  { pathId: 'p-lh-sql', cls: 'fabric', r: 2.3, dur: 2.6, begin: -1.3 },
  { pathId: 'p-lh-df', cls: 'fabric', r: 2, dur: 3 },
  { pathId: 'p-spark-foundry', cls: 'fabric', r: 2.3, dur: 2.4 },
  { pathId: 'p-spark-aml', cls: 'fabric', r: 2.3, dur: 2.6 },
  { pathId: 'p-sql-pbi', cls: 'running', r: 2.6, dur: 2.4 },
  { pathId: 'p-sql-pbi', cls: 'running', r: 2.6, dur: 2.4, begin: -0.8 },
  { pathId: 'p-sql-pbi', cls: 'running', r: 2.6, dur: 2.4, begin: -1.6 },
  { pathId: 'p-foundry-agent', cls: 'pending', r: 2.3, dur: 3.4 },
  { pathId: 'p-foundry-agent', cls: 'pending', r: 2.3, dur: 3.4, begin: -1.7 },
  { pathId: 'p-aml-vector', cls: 'pending', r: 2.3, dur: 3.6 },
  { pathId: 'p-pbi-bi', cls: 'running', r: 2.6, dur: 2.2 },
  { pathId: 'p-pbi-bi', cls: 'running', r: 2.6, dur: 2.2, begin: -1.1 },
  { pathId: 'p-agent-ia', cls: 'pending', r: 2.3, dur: 3.4 },
  { pathId: 'p-vector-sw', cls: 'running', r: 2.6, dur: 2.4 },
  { pathId: 'p-share-rpa', cls: 'pending', r: 2.3, dur: 3.6 },
  { pathId: 'p-back-erp', cls: 'late', r: 3, dur: 6 },
  { pathId: 'p-share-gen', cls: 'backlog', r: 2, dur: 9 },
];

function LogoSymbols() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <symbol id="i-eventhubs" viewBox="0 0 24 24"><path d="M12 2 L22 7 V17 L12 22 L2 17 V7 Z" fill="#fff" opacity="0.95" /><path d="M8 12 H16 M14 9 L16 12 L14 15" stroke="#0078D4" strokeWidth="1.6" fill="none" strokeLinecap="round" /></symbol>
        <symbol id="i-iothub" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5" fill="#fff" /><circle cx="4" cy="6" r="1.6" fill="#fff" /><circle cx="20" cy="6" r="1.6" fill="#fff" /><circle cx="4" cy="18" r="1.6" fill="#fff" /><circle cx="20" cy="18" r="1.6" fill="#fff" /><line x1="6" y1="7" x2="9.5" y2="10.5" stroke="#fff" strokeWidth="1.2" /><line x1="18" y1="7" x2="14.5" y2="10.5" stroke="#fff" strokeWidth="1.2" /><line x1="6" y1="17" x2="9.5" y2="13.5" stroke="#fff" strokeWidth="1.2" /><line x1="18" y1="17" x2="14.5" y2="13.5" stroke="#fff" strokeWidth="1.2" /></symbol>
        <symbol id="i-fabric" viewBox="0 0 24 24"><path d="M5 5 H17 L19 7 V10 H10 V13 H17 V18 L15 20 H5 Z" fill="#fff" /></symbol>
        <symbol id="i-eventstreams" viewBox="0 0 24 24"><path d="M3 8 Q8 5 12 8 T21 8" stroke="#fff" strokeWidth="1.6" fill="none" /><path d="M3 16 Q8 13 12 16 T21 16" stroke="#fff" strokeWidth="1.6" fill="none" /><path d="M11 5 L9 11 H12 L10 19" stroke="#fff" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></symbol>
        <symbol id="i-datafactory" viewBox="0 0 24 24"><circle cx="9" cy="9" r="3.5" fill="none" stroke="#fff" strokeWidth="1.6" /><circle cx="9" cy="9" r="1.4" fill="#fff" /><circle cx="16" cy="15" r="3" fill="none" stroke="#fff" strokeWidth="1.6" /><circle cx="16" cy="15" r="1.2" fill="#fff" /><line x1="9" y1="13" x2="9" y2="16" stroke="#fff" strokeWidth="1.4" /></symbol>
        <symbol id="i-sql" viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="7" ry="2.5" fill="#fff" /><path d="M5 6 V18 Q5 20.5 12 20.5 Q19 20.5 19 18 V6" fill="#fff" opacity="0.85" /><text x="12" y="16" textAnchor="middle" fontSize="6" fontFamily="monospace" fontWeight="bold" fill="#2E3D52">SQL</text></symbol>
        <symbol id="i-eventhouse" viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="6.5" ry="2.5" fill="#fff" /><path d="M5.5 6 V17 Q5.5 19.5 12 19.5 Q18.5 19.5 18.5 17 V6" fill="#fff" opacity="0.9" /><path d="M11.5 8 L9 13 H12 L10.5 17.5" stroke="#119887" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></symbol>
        <symbol id="i-lakehouse" viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="6.5" ry="2.5" fill="#fff" /><path d="M5.5 6 V14 Q5.5 16.5 12 16.5 Q18.5 16.5 18.5 14 V6" fill="#fff" opacity="0.9" /><path d="M3 19 Q6 17 9 19 T15 19 T21 19" stroke="#fff" strokeWidth="1.6" fill="none" /><path d="M3 21.5 Q6 19.5 9 21.5 T15 21.5 T21 21.5" stroke="#fff" strokeWidth="1.4" fill="none" opacity="0.7" /></symbol>
        <symbol id="i-mirror" viewBox="0 0 24 24"><ellipse cx="7" cy="7" rx="4" ry="1.6" fill="#fff" /><path d="M3 7 V13 Q3 14.6 7 14.6 Q11 14.6 11 13 V7" fill="#fff" opacity="0.9" /><ellipse cx="17" cy="17" rx="4" ry="1.6" fill="#fff" /><path d="M13 17 V11 Q13 9.4 17 9.4 Q21 9.4 21 11 V17" fill="#fff" opacity="0.9" /><path d="M11 11 L13 13" stroke="#fff" strokeWidth="1.2" /></symbol>
        <symbol id="i-kql" viewBox="0 0 24 24"><path d="M5 3 H15 L19 7 V21 H5 Z" fill="#fff" /><path d="M15 3 V7 H19" fill="none" stroke="#1268A8" strokeWidth="1.2" /><text x="11" y="16" textAnchor="middle" fontSize="5" fontFamily="monospace" fontWeight="bold" fill="#1268A8">KQL</text></symbol>
        <symbol id="i-spark" viewBox="0 0 24 24"><path d="M5 3 H17 V21 H5 Z M9 3 V21" fill="#fff" stroke="none" /><path d="M9 3 V21" stroke="#DD5500" strokeWidth="0.7" /><path d="M14 8 Q12 11 14 14 Q16 12 14 8 Z" fill="#DD5500" /></symbol>
        <symbol id="i-sqlscript" viewBox="0 0 24 24"><path d="M5 3 H15 L19 7 V21 H5 Z" fill="#fff" /><path d="M15 3 V7 H19" fill="none" stroke="#5C6E84" strokeWidth="1.2" /><text x="12" y="16" textAnchor="middle" fontSize="5" fontFamily="monospace" fontWeight="bold" fill="#2E3D52">SQL</text></symbol>
        <symbol id="i-dataflow" viewBox="0 0 24 24"><circle cx="5" cy="12" r="2.2" fill="#fff" /><circle cx="19" cy="6" r="2.2" fill="#fff" /><circle cx="19" cy="18" r="2.2" fill="#fff" /><path d="M7 12 L17 7" stroke="#fff" strokeWidth="1.4" /><path d="M7 12 L17 17" stroke="#fff" strokeWidth="1.4" /></symbol>
        <symbol id="i-foundry" viewBox="0 0 24 24"><path d="M6 4 H18 V8 H10 V11 H17 V14 H10 V20 H6 Z" fill="#fff" /></symbol>
        <symbol id="i-azureml" viewBox="0 0 24 24"><circle cx="6" cy="7" r="2" fill="#fff" /><circle cx="6" cy="17" r="2" fill="#fff" /><circle cx="18" cy="12" r="2.5" fill="#fff" /><circle cx="12" cy="6" r="1.6" fill="#fff" /><circle cx="12" cy="18" r="1.6" fill="#fff" /><line x1="8" y1="7" x2="11" y2="6" stroke="#fff" strokeWidth="1.2" /><line x1="8" y1="17" x2="11" y2="18" stroke="#fff" strokeWidth="1.2" /><line x1="13" y1="7" x2="16" y2="11" stroke="#fff" strokeWidth="1.2" /><line x1="13" y1="17" x2="16" y2="13" stroke="#fff" strokeWidth="1.2" /></symbol>
        <symbol id="i-powerbi" viewBox="0 0 24 24"><rect x="4" y="14" width="3.5" height="6" fill="#1F1F1F" /><rect x="10.25" y="9" width="3.5" height="11" fill="#1F1F1F" /><rect x="16.5" y="4" width="3.5" height="16" fill="#1F1F1F" /></symbol>
        <symbol id="i-dataagent" viewBox="0 0 24 24"><path d="M4 5 H20 V15 H13 L9 19 V15 H4 Z" fill="#fff" /><circle cx="9" cy="10" r="0.9" fill="#119887" /><circle cx="12" cy="10" r="0.9" fill="#119887" /><circle cx="15" cy="10" r="0.9" fill="#119887" /></symbol>
        <symbol id="i-vector" viewBox="0 0 24 24"><circle cx="6" cy="7" r="1.4" fill="#fff" /><circle cx="11" cy="5" r="1.4" fill="#fff" /><circle cx="17" cy="8" r="1.4" fill="#fff" /><circle cx="20" cy="13" r="1.4" fill="#fff" /><circle cx="14" cy="14" r="1.4" fill="#fff" /><circle cx="8" cy="14" r="1.4" fill="#fff" /><circle cx="5" cy="19" r="1.4" fill="#fff" /><circle cx="13" cy="20" r="1.4" fill="#fff" /><circle cx="19" cy="19" r="1.4" fill="#fff" /></symbol>
        <symbol id="i-purview" viewBox="0 0 24 24"><path d="M2 12 Q7 5 12 5 Q17 5 22 12 Q17 19 12 19 Q7 19 2 12 Z" fill="none" stroke="#fff" strokeWidth="1.6" /><circle cx="12" cy="12" r="3.5" fill="#fff" /><circle cx="12" cy="12" r="1.4" fill="#1A6580" /></symbol>
        <symbol id="i-entra" viewBox="0 0 24 24"><path d="M12 3 L20 6 V12 Q20 17 12 21 Q4 17 4 12 V6 Z" fill="#fff" /><circle cx="12" cy="11" r="2.2" fill="#0078D4" /><path d="M8 16 Q12 13 16 16" fill="none" stroke="#0078D4" strokeWidth="1.4" /></symbol>
        <symbol id="i-cost" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#fff" /><text x="12" y="17" textAnchor="middle" fontSize="14" fontFamily="sans-serif" fontWeight="bold" fill="#1F8550">$</text></symbol>
        <symbol id="i-keyvault" viewBox="0 0 24 24"><circle cx="8" cy="12" r="4" fill="none" stroke="#fff" strokeWidth="1.6" /><circle cx="8" cy="12" r="1.4" fill="#fff" /><line x1="12" y1="12" x2="21" y2="12" stroke="#fff" strokeWidth="1.6" /><line x1="18" y1="12" x2="18" y2="16" stroke="#fff" strokeWidth="1.6" /><line x1="21" y1="12" x2="21" y2="16" stroke="#fff" strokeWidth="1.6" /></symbol>
        <symbol id="i-monitor" viewBox="0 0 24 24"><path d="M3 16 Q3 7 12 7 Q21 7 21 16" fill="none" stroke="#fff" strokeWidth="1.6" /><line x1="12" y1="16" x2="17" y2="9" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" /><circle cx="12" cy="16" r="1.4" fill="#fff" /></symbol>
        <symbol id="i-defender" viewBox="0 0 24 24"><path d="M12 3 L20 6 V12 Q20 17 12 21 Q4 17 4 12 V6 Z" fill="#fff" /><path d="M8 12 L11 15 L16 9" stroke="#0064A8" strokeWidth="1.8" fill="none" strokeLinecap="round" /></symbol>
        <symbol id="i-devops" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#fff" /><path d="M9 8 Q9 6 12 6 Q15 6 15 8 Q15 10 13 10.5 Q13 12 14 13 L13 17 H11 L10 13 Q11 12 11 10.5 Q9 10 9 8 Z" fill="#1F1F1F" /></symbol>
        <symbol id="i-policy" viewBox="0 0 24 24"><path d="M4 5 H17 V19 H7 L4 16 Z" fill="#fff" /><line x1="8" y1="9" x2="14" y2="9" stroke="#1F7A98" strokeWidth="1.2" /><line x1="8" y1="12" x2="14" y2="12" stroke="#1F7A98" strokeWidth="1.2" /><line x1="8" y1="15" x2="12" y2="15" stroke="#1F7A98" strokeWidth="1.2" /></symbol>
        <symbol id="i-fluig" viewBox="0 0 24 24"><path d="M5 5 H18 V8 H10 V11 H16 V14 H10 V19 H5 Z" fill="#fff" /></symbol>
        <symbol id="i-totvs" viewBox="0 0 24 24"><path d="M4 4 H20 V8 H14 V20 H10 V8 H4 Z" fill="#fff" /></symbol>
        <symbol id="i-sharepoint" viewBox="0 0 24 24"><circle cx="9" cy="12" r="6.5" fill="#fff" /><circle cx="16" cy="12" r="4.5" fill="#fff" opacity="0.85" /><text x="9" y="15" textAnchor="middle" fontSize="6" fontFamily="sans-serif" fontWeight="bold" fill="#036C99">S</text></symbol>
      </defs>
    </svg>
  );
}

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const pad = (n: number) => String(n).padStart(2, '0');
  return <span className="pl-timestamp">{`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`}</span>;
}

function PipelineTile({ t }: { t: Tile }) {
  return (
    <div
      className={`pl-tile${t.delp ? ' delp' : ''}`}
      style={{ top: t.top, left: t.left, width: t.width }}
    >
      <div className={`pl-logo-bg pl-bg-${t.bg}`}>
        <svg><use href={`#i-${t.icon}`} /></svg>
      </div>
      <div className="pl-tile-body">
        <div className="pl-tile-name" style={t.smallName ? { fontSize: 11.5 } : undefined}>{t.name}</div>
        <div className="pl-tile-sub">{t.sub}</div>
      </div>
    </div>
  );
}

export default function PipelineView() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);

  if (view !== 'pipeline') return null;

  return (
    <div className="pipeline-root">
      <LogoSymbols />

      <header className="layer pl-chrome-top">
        <div className="pl-brand-wrap">
          <button className="pl-back-btn" title="Voltar ao Sistema Solar Delp" onClick={() => setView('solar')}>
            ◂◂  Solar
          </button>
          <div className="pl-brand">
            <span className="pl-logo-mark">
              <span className="pl-logo-square" />
              NID·DELP
            </span>
            <span style={{ color: 'var(--pl-text-faint)', fontWeight: 400 }}>/</span>
            <span style={{ fontWeight: 500, color: 'var(--pl-text)' }}>Pipeline de Dados</span>
            <span className="sub">Microsoft Fabric · OneLake · Azure</span>
          </div>
        </div>
        <div className="pl-status-strip">
          <span className="pl-live">Live</span>
          <span>UTC-3 BRT</span>
          <LiveClock />
          <span>Nodes 24/24</span>
          <span style={{ color: 'var(--pl-late)' }}>SLA · 1 Breach</span>
        </div>
        <div className="pl-chrome-actions">
          <button className="pl-chrome-btn active">All</button>
          <button className="pl-chrome-btn">Running</button>
          <button className="pl-chrome-btn">Late</button>
          <button className="pl-chrome-btn">Pending</button>
          <button className="pl-chrome-btn">Backlog</button>
        </div>
      </header>

      <main className="layer pl-main">
        <div className="pl-canvas-wrap">
          <div className="pl-canvas">

            <div className="pl-col-header" style={{ top: 12, left: 24, width: 180 }}><span className="num">01</span>Sources</div>
            <div className="pl-col-header" style={{ top: 12, left: 230, width: 130 }}><span className="num">02</span>Ingest</div>
            <div className="pl-col-header" style={{ top: 12, left: 380, width: 460 }}><span className="num">03</span>Microsoft Fabric · OneLake</div>
            <div className="pl-col-header" style={{ top: 12, left: 860, width: 200 }}><span className="num">04</span>Process</div>
            <div className="pl-col-header" style={{ top: 12, left: 1080, width: 180 }}><span className="num">05</span>Enrich</div>
            <div className="pl-col-header" style={{ top: 12, left: 1280, width: 200 }}><span className="num">06</span>Serve</div>
            <div className="pl-col-header" style={{ top: 12, left: 1500, width: 175 }}><span className="num">07</span>NID Delp · Projetos</div>

            <div className="pl-zone pl-zone-fabric" style={{ top: 56, left: 380, width: 460, height: 660 }}>
              <span className="pl-zone-label">Microsoft Fabric</span>
            </div>

            <svg className="pl-conduit-layer" viewBox="0 0 1700 940" preserveAspectRatio="none">
              <defs>
                <linearGradient id="g-running" x1="0" x2="1"><stop offset="0" stopColor="#22C97A" stopOpacity="0.18" /><stop offset="1" stopColor="#22C97A" stopOpacity="0.55" /></linearGradient>
                <linearGradient id="g-pending" x1="0" x2="1"><stop offset="0" stopColor="#FFB940" stopOpacity="0.18" /><stop offset="1" stopColor="#FFB940" stopOpacity="0.55" /></linearGradient>
                <linearGradient id="g-late" x1="0" x2="1"><stop offset="0" stopColor="#FF4D6D" stopOpacity="0.18" /><stop offset="1" stopColor="#FF4D6D" stopOpacity="0.55" /></linearGradient>
                <linearGradient id="g-backlog" x1="0" x2="1"><stop offset="0" stopColor="#5C6577" stopOpacity="0.12" /><stop offset="1" stopColor="#5C6577" stopOpacity="0.32" /></linearGradient>
                <linearGradient id="g-fabric" x1="0" x2="1"><stop offset="0" stopColor="#11A887" stopOpacity="0.25" /><stop offset="1" stopColor="#11A887" stopOpacity="0.65" /></linearGradient>
                <linearGradient id="g-azure" x1="0" x2="1"><stop offset="0" stopColor="#0078D4" stopOpacity="0.2" /><stop offset="1" stopColor="#0078D4" stopOpacity="0.55" /></linearGradient>
              </defs>

              {CONDUITS.map((c) => (
                <path key={c.id} id={c.id} className={`pl-conduit${c.cold ? ' cold' : ''}`} d={c.d} stroke={`url(#${c.stroke})`} strokeWidth={c.width} />
              ))}

              {PARTICLES.map((p, i) => (
                <circle key={i} r={p.r} className={`pl-particle ${p.cls}`}>
                  <animateMotion dur={`${p.dur}s`} begin={p.begin !== undefined ? `${p.begin}s` : undefined} repeatCount="indefinite">
                    <mpath href={`#${p.pathId}`} />
                  </animateMotion>
                </circle>
              ))}
            </svg>

            {SOURCES.map((t) => <PipelineTile key={`src-${t.left}-${t.top}`} t={t} />)}
            {INGEST.map((t) => <PipelineTile key={`ing-${t.left}-${t.top}`} t={t} />)}
            {FABRIC_INGEST.map((t) => <PipelineTile key={`fi-${t.left}-${t.top}`} t={t} />)}
            {FABRIC_STORAGE.map((t) => <PipelineTile key={`fs-${t.left}-${t.top}`} t={t} />)}
            {PROCESS_TILES.map((t) => <PipelineTile key={`pr-${t.left}-${t.top}`} t={t} />)}
            {ENRICH.map((t) => <PipelineTile key={`en-${t.left}-${t.top}`} t={t} />)}
            {SERVE.map((t) => <PipelineTile key={`sv-${t.left}-${t.top}`} t={t} />)}

            <div className="pl-annot lambda" style={{ top: 78, left: 480 }}>λ Lambda Architecture</div>
            <div className="pl-path-tag hot" style={{ top: 152, left: 432 }}>Hot Path</div>
            <div className="pl-path-tag cold" style={{ top: 222, left: 432 }}>Cold Path</div>
            <div className="pl-annot callout" style={{ top: 423, left: 24 }}>// Cold path · History &amp; trend analysis</div>
            <div className="pl-annot callout" style={{ top: 220, left: 590, color: 'var(--pl-fabric-green)' }}>Enterprise data warehouse capabilities</div>
            <div className="pl-annot callout" style={{ top: 480, left: 650, color: 'var(--pl-fabric-green)', fontWeight: 500 }}>◉ OneLake Storage</div>
            <div className="pl-annot callout" style={{ top: 332, left: 1085, maxWidth: 160 }}>Predictive analytics &amp; ML training</div>

            {STACKS.map((s) => (
              <PipelineTile key={s.stackKey} t={s} />
            ))}

            <div className="pl-govern-strip">
              <span className="label">Discover &amp; Govern</span>
              <div className="pl-govern-tool">
                <div className="pl-logo-bg pl-bg-purview-teal ico"><svg><use href="#i-purview" /></svg></div>
                <span>Microsoft Purview</span>
              </div>
              <span style={{ flex: 1, fontFamily: 'Geist Mono, monospace', fontSize: 10, color: 'var(--pl-text-faint)', letterSpacing: '0.16em', textTransform: 'uppercase', textAlign: 'right' }}>Lineage · Catalog · DLP</span>
            </div>

            <div className="pl-platform-strip">
              <span className="label">Platform</span>
              <div className="pl-platform-tools">
                <div className="pl-platform-tool"><div className="pl-logo-bg pl-bg-entra-blue ico"><svg><use href="#i-entra" /></svg></div><span>Entra ID</span></div>
                <div className="pl-platform-tool"><div className="pl-logo-bg pl-bg-cost-green ico"><svg><use href="#i-cost" /></svg></div><span>Cost Mgmt</span></div>
                <div className="pl-platform-tool"><div className="pl-logo-bg pl-bg-keyvault ico"><svg><use href="#i-keyvault" /></svg></div><span>Key Vault</span></div>
                <div className="pl-platform-tool"><div className="pl-logo-bg pl-bg-monitor ico"><svg><use href="#i-monitor" /></svg></div><span>Monitor</span></div>
                <div className="pl-platform-tool"><div className="pl-logo-bg pl-bg-defender-blue ico"><svg><use href="#i-defender" /></svg></div><span>Defender</span></div>
                <div className="pl-platform-tool"><div className="pl-logo-bg pl-bg-devops ico"><svg><use href="#i-devops" /></svg></div><span>DevOps · GitHub</span></div>
                <div className="pl-platform-tool"><div className="pl-logo-bg pl-bg-policy ico"><svg><use href="#i-policy" /></svg></div><span>Policy</span></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
