# NID · Planeta Delp (v2)

Apresentação 3D interativa para TV touch no Núcleo de Inovação Delp.

## Stack
- Next 15 + React 19 + TypeScript
- Three.js r170 · @react-three/fiber · drei · postprocessing
- Tailwind CSS
- xlsx (seeder build-time → `public/data/*.json`)

## Dev
```bash
npm install
npm run seed    # lê NID_DELP_Carteira_Projetos_BI.xlsx → public/data
npm run dev     # http://localhost:3000
```

## Fonte de dados
Por padrão o seeder lê o `.xlsx` em `NID SITE/` no OneDrive.
Para apontar outro arquivo:
```bash
XLSX_PATH="/caminho/para/arquivo.xlsx" npm run seed
```
Ou `POST /api/reseed` em runtime.

## Fases
- [x] Fase 1 — scaffold + planeta base girando + seeder
- [ ] Fase 2 — shaders GLSL (terrain, ocean, atmosphere)
- [ ] Fase 3 — continentes clicáveis + câmera cinematográfica
- [ ] Fase 4 — cidades instanciadas + motores
- [ ] Fase 5 — foguete + planetas de tecnologia
- [ ] Fase 6 — UI (lema, números, organograma)
- [ ] Fase 7 — modo kiosk TV
