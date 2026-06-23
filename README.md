# NID · Planeta — Núcleo de Inovação Delp

Apresentação interativa do Núcleo de Inovação da **Delp Engenharia**.
Hospeda **Petronius**, a IA companion do NID, e abre três portais para o
ecossistema do núcleo.

## Narrativa

A landing (`/`) é uma **cena fixa em 3 atos** dirigida pelo scroll:

1. **Ato 1 — Hero (0–30 %).** Petronius aparece em pé, no centro.
   Hero text à esquerda (`landing-intro` portado do Moncy), à direita
   `DESBRAVADOR ↔ INOVADOR` alternando. HUD esquerda em JetBrains Mono.
2. **Ato 2 — Bancada NID (30–70 %).** A "câmera" se afasta. Petronius
   encolhe e cede o slot central da mesa de desenvolvimento. Quatro dos
   cinco engenheiros do NID rotacionam pelos slots laterais conforme
   `--p2` avança (opção c). Cada monitor mostra código condizente com o
   papel; balão de fala digitado e HUD direita lazy-mountam.
3. **Ato 3 — Portais (70–100 %).** Surge a dock central: **Sistema
   Solar**, **Pipeline**, **UniversiNID**. Click → fade radial colorido
   da cor do portal (1.2 s) e navega.

## Rotas

| URL                            | Conteúdo                                            |
| ------------------------------ | --------------------------------------------------- |
| `/`                            | Landing NID · Planeta (Petronius + 3 atos)          |
| `/sistema-solar`               | Apresentação 3D para TV touch (sistema solar)       |
| `/sistema-solar?view=pipeline` | Sistema Solar com overlay Pipeline aberto           |
| `/universinid`                 | Portal UniversiNID estático (rewrite → `.html`)     |
| `/api/reseed`                  | Re-importa o `.xlsx` em runtime                     |

## Equipe NID

| Slot | Nome              | Papel                                          | Cor       |
| ---- | ----------------- | ---------------------------------------------- | --------- |
| Host | Petronius         | IA Companion · NID Delp (orquestrador central) | `#DD8F1A` |
| 1    | Henrique Emiliano | Tech Lead · Arquitetura                        | `#21D4FD` |
| 2    | Luis Castro       | RPA · Automações · Agentes IA                  | `#A89BF0` |
| 3    | Lucas França      | B.I. · Dados · RPA                             | `#38E0A0` |
| 4    | Rafael            | Product Owner                                  | `#FF6B9D` |
| 5    | César Augustus    | DevSecOps                                      | `#FFB45A` |

## Stack

- **Next 15** + React 19 + TypeScript
- **Three.js r170** · @react-three/fiber · drei · postprocessing (`/sistema-solar`)
- **Tailwind CSS** (cores `delp-*`, `nid-*`, `crew-*`)
- **xlsx** (seeder build-time → `public/data/*.json`)
- Landing **sem libs novas** — scroll driver à mão (CSS custom properties +
  scroll listener `passive`), tipografia Geist · Orbitron · JetBrains Mono · Barlow.

## Dev

```bash
npm install
npm run seed    # lê NID_DELP_Carteira_Projetos_BI.xlsx → public/data
npm run dev     # http://localhost:3000
```

Apontar outro arquivo de carteira:
```bash
XLSX_PATH="/caminho/para/arquivo.xlsx" npm run seed
```
Ou `POST /api/reseed` em runtime.

## Acessibilidade & Performance

- Respeita `prefers-reduced-motion`: scanlines off, typewriter instantâneo,
  cursor nativo, swap da frase rotativa estático, blob rotation pausada.
- Cursor custom só em viewports `≥ 720 px`.
- `< 1024 px`: hero empilha, bancada do Ato 2 escondida (Petronius + dock vertical).
- Scroll listener `{ passive: true }`. Lazy-mount dos HUDs/SpeechBubble após
  `--p > 0.20`. Animações via CSS variables (zero re-render React por frame).

## Estrutura

```
src/
├── app/
│   ├── page.tsx                # Landing (Petronius + 3 atos)
│   ├── landing.css             # Escopo CSS da landing
│   ├── sistema-solar/page.tsx  # Sistema Solar (kiosk TV)
│   ├── layout.tsx              # Root + fonts
│   └── globals.css             # body { overflow:hidden } global
├── components/
│   ├── landing/                # Header, RimBlobs, HeroText, PetroniusAvatar,
│   │                           # CrewMonitor, CrewBench, SpeechBubble, Huds,
│   │                           # PortalDock, CustomCursor, Decor
│   ├── Scene.tsx, Hud.tsx, ... # Sistema Solar
│   └── ...
└── lib/
    ├── landing/
    │   ├── team.ts             # Roster do NID
    │   ├── snippets.ts         # Código por papel (monitores)
    │   ├── script.ts           # Falas do Petronius
    │   ├── useScrollProgress.ts
    │   └── useReducedMotion.ts
    ├── store.ts                # zustand
    └── ...
```

## Fases

- [x] Fase 1 — scaffold + planeta base girando + seeder
- [x] Landing NID · Planeta com Petronius (3 atos · scroll-driven · zero new deps)
- [ ] Fase 2 — shaders GLSL (terrain, ocean, atmosphere)
- [ ] Fase 3 — continentes clicáveis + câmera cinematográfica
- [ ] Fase 4 — cidades instanciadas + motores
- [ ] Fase 5 — foguete + planetas de tecnologia
- [ ] Fase 6 — UI (lema, números, organograma)
- [ ] Fase 7 — modo kiosk TV
