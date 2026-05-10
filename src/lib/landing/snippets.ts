/**
 * Code snippets streaming on each monitor in Act 2.
 *
 * Goal: each one *reads* like the role's daily work in 6-12 short lines.
 * Width is constrained — keep lines ≤ 32 chars when possible (the monitor
 * SVG is ~270px wide on desktop, ~220px on tablet).
 *
 * The CrewMonitor types out a substring that grows with `--p2`, then loops.
 * No syntax highlighting — JetBrains Mono carries the vibe.
 */
import type { CrewRole } from './team';

export const SNIPPETS: Record<CrewRole, string> = {
  // Henrique — code review, architecture
  'tech-lead': `// nid/scene/Planeta.tsx
+ const orbit = useOrbit(seed)
+ // LGTM: extract to hook
- if (mesh.current) {
-   mesh.current.lookAt(sun)
- }
$ git rebase -i main
$ pnpm build && pnpm test
> ✔ 124 passed (1.8s)`,

  // Luis — RPA + agents
  rpa: `// agents/relatorio-diario.ts
const agent = orchestrator
  .spawn('relatorio-diario')
  .tool(planilha, sap, slack)
await agent.run({
  task: 'fechamento mensal',
  retries: 3,
})
$ puppeteer.launch({...})
> ok 14/14`,

  // Petronius — central orchestrator (host)
  host: `// @delp/core/petronius
import { NID } from '@delp/core'
const orchestrator = new NID({
  agent: 'petronius',
  team: ['henrique','luis',
         'lucas','rafael',
         'cesar'],
})
await orchestrator
  .deploy('innovation')
> online · uptime 99.9%`,

  // Lucas — B.I. + data + RPA
  bi: `-- pipeline/horas-economizadas
SELECT setor,
       SUM(horas) AS poupadas
FROM   nid.projetos
WHERE  status = 'construido'
GROUP  BY setor
ORDER  BY 2 DESC;
# pyspark
df.groupBy('squad')
  .agg(F.sum('horas'))`,

  // Rafael — Product Owner
  po: `# OKR · Q2 NID
- [x] Pipeline em produção
- [x] UniversiNID v1
- [ ] Planeta · onboarding
- [ ] 30+ projetos no portfolio
roadmap:
  abr: Pipeline v2
  mai: Planeta · prod
  jun: NID · Studio`,

  // César — DevSecOps
  devsec: `# infra/k8s/nid-planeta
$ terraform apply
  + module.cdn (vercel)
  + module.dns (cf)
$ kubectl rollout status \\
    deploy/nid-planeta
$ trivy scan --severity HIGH
> 0 vulnerabilities`,
};
