# ADR-0002 — UniversiNID: endurecimento baseline da CSP (revert do adiamento FASE-07 §8 #2)

- **Status:** ✅ Aceito (aprovado 2026-06-13; aplicado e verificado 2026-06-14)
- **Projeto:** nid-planeta · UniversiNID (pós-Fase 2a)
- **Contexto-fonte:** `especificacoes/1-fase-atual/FASE-07-csp-revisao-e-fechamento/SPEC.md` §8 (Decisões em aberto #1/#2)
- **Decisores:** Henrique Emiliano (aprovação) + Claude (análise + verificação)
- **Relação:** estende o rider **B4** materializado na FASE-07 (tarefa 7.1)

## Contexto

A FASE-07 entregou a **CSP B4** (rider) **somente** em `src/middleware.ts`, escopada a
`/universinid/:path*` — a landing `/` e o kiosk `/sistema-solar` ficam **fora do matcher**
(sem header, para não arriscar o canvas 3D). O conjunto B4 tinha **4 diretivas funcionais**:
`frame-src`, `img-src`, `script-src 'self' 'unsafe-inline'`, `style-src 'self' 'unsafe-inline'
https://fonts.googleapis.com`.

A revisão da FASE-07 apontou **3 diretivas de baseline ausentes** (defense-in-depth), mas a
**SPEC §8 #2 decidiu adiar** qualquer endurecimento além do B4 ("manter apenas as 4… confirmar se
algum endurecimento extra é desejado") e a §3.2 proibiu adicionar diretivas **sem aprovação do dono
do quadro**. Este ADR registra a **reversão desse adiamento**, com aprovação.

> ⚠️ **Por que cada diretiva precisa ser explícita:** a CSP **não tem `default-src`**. Sem um
> `default-src` para herdar, o que **não** está escrito fica **irrestrito**, não bloqueado. Logo,
> diretivas de baseline só protegem se forem listadas uma a uma.

## Decisão

Adicionar **4 diretivas de baseline** ao conjunto, totalizando **8 diretivas** na constante `CSP`
de `src/middleware.ts` (nada muda no matcher nem nas 4 funcionais do B4):

| Diretiva adicionada | Valor | Por quê |
|---|---|---|
| `object-src` | `'none'` | sem ela, `<object>`/`<embed>`/`<applet>` ficariam irrestritos; o app não usa nenhum |
| `base-uri` | `'self'` | impede que um `<base href>` injetado reescreva o destino de URLs relativas |
| `connect-src` | `'self'` | `fetch`/XHR/WebSocket só same-origin; o app só chama `/api/universinid/**` (upload é server-side) |
| `frame-ancestors` | `'self'` | anti-clickjacking: só o próprio site pode enquadrar `/universinid` em `<iframe>` |

**Impacto funcional esperado: zero.** O app não usa `<object>`/`<base>`, só faz fetch same-origin,
e não é embedado cross-origin.

## Verificação (dev + build de produção)

| Evidência | Resultado |
|---|---|
| Header em `/universinid/login` (dev **e** prod) | as **8 diretivas** presentes |
| Header em `/` e `/sistema-solar` | **ausente** — matcher intacto, landing 3D/kiosk não tocados |
| `connect-src 'self'` — WebSocket de HMR (dev) | sem violação no console |
| `connect-src 'self'` — fetch same-origin | `/api/auth/session` 200, `/api/universinid/admin/courses` 200, navegação RSC client-side |
| App + editor BlockNote (modo prod) | hidrata, **monta e carrega conteúdo**, 0 erros/violações no console |
| `npm run build` limpo | verde ponta a ponta (compile + types + page data + 17/17 páginas); `Middleware 87.5 kB` |

## Consequências

**Positivas:** fecha 4 lacunas de baseline da CSP (defense-in-depth) com impacto funcional nulo.

**Dívidas / pontos de atenção:**
- **`connect-src 'self'` restringe chamadas cross-origin do browser.** Qualquer feature futura que
  precise chamar uma API externa **do cliente** (analytics, telemetria, IA via browser) terá de
  **estender `connect-src`** explicitamente — caso contrário a chamada é bloqueada silenciosamente.
- **Gotcha de migração (Mermaid):** a lição legada renderiza via `<iframe src="/universinid.html">`.
  O `/universinid.html` é **estático e fora do matcher** → roda **sem CSP** → carrega **Mermaid de
  `cdn.jsdelivr.net`** livremente hoje. Quando as lições legadas forem **decompostas** para render
  nativo React (sob a CSP do parent), `script-src 'self' 'unsafe-inline'` vai **bloquear** Mermaid via
  CDN: será preciso **self-hospedar** a lib, **renderizar server-side**, ou **estender `script-src`**.

## Decisão correlata ainda em aberto (FASE-07 §8 #1)

Mismatch `frame-src` × allowlist do write-time para hosts "nus" (`youtube.com`/`youtu.be`/`vimeo.com`
sem subdomínio): **não** endereçado por este ADR. Permanece como item a decidir quando um embed com
host nu reproduzir bloqueio no render.

## Evidência (referências)

- CSP — diretivas sem `default-src` não herdam fallback — https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy
- `frame-ancestors` (anti-clickjacking, só via header) — https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors
- Implementação: `src/middleware.ts` (constante `CSP`, matcher `/universinid/:path*`)
