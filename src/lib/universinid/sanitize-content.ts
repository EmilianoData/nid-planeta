const EMBED_HOSTS = ['youtube.com', 'www.youtube.com', 'youtu.be', 'vimeo.com', 'player.vimeo.com'];
const VIDEODELIVERY = /\.videodelivery\.net$/;

export function isSafeHttpUrl(raw: unknown): raw is string {
  if (typeof raw !== 'string') return false;
  try {
    const u = new URL(raw);
    // Rejeita credenciais embutidas (ex.: http://youtube.com@evil.com) — o host "visível"
    // é só userinfo; o destino real é outro. Deception/phishing em conteúdo visto pelo aluno.
    if (u.username || u.password) return false;
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}
export function isAllowedEmbed(raw: unknown): boolean {
  if (!isSafeHttpUrl(raw)) return false;
  try { const h = new URL(raw).hostname; return EMBED_HOSTS.includes(h) || VIDEODELIVERY.test(h); } catch { return false; }
}
export interface ContentCheck { ok: boolean; error?: string; }
type ValidationMode = 'autosave' | 'publish';

// Valida as props de um bloco `quiz` (FASE-08). `autosave` é leniente (edição em andamento);
// `publish` exige quiz completo. `questoesJson` malformado é corrupção → rejeitado em ambos os modos.
function validateQuizBlock(props: Record<string, unknown> | undefined, mode: ValidationMode): ContentCheck {
  const raw = props?.['questoesJson'];
  const vazio = raw === undefined || raw === null || raw === '' || raw === '[]';
  if (mode === 'autosave' && vazio) return { ok: true }; // quiz recém-inserido, edição em andamento
  let parsed: unknown;
  try { parsed = JSON.parse(typeof raw === 'string' ? raw : '[]'); }
  catch { return { ok: false, error: 'quiz: questoesJson inválido' }; }
  if (!Array.isArray(parsed)) return { ok: false, error: 'quiz: questoesJson deve ser um array' };
  if (mode === 'autosave') return { ok: true }; // tolera questões incompletas durante a edição
  // modo publish — validação forte (espelha o gate de saída do conteúdo ao aluno)
  if (parsed.length < 1) return { ok: false, error: 'quiz: precisa de ao menos 1 questão para publicar' };
  const notaCorte = props?.['notaCorte'];
  if (notaCorte !== undefined && (typeof notaCorte !== 'number' || notaCorte < 1 || notaCorte > 100))
    return { ok: false, error: 'quiz: nota de corte deve estar entre 1 e 100' };
  for (const q of parsed) {
    const qq = (q ?? {}) as { enunciado?: unknown; alternativas?: unknown; corretaIdx?: unknown };
    if (typeof qq.enunciado !== 'string' || qq.enunciado.trim() === '')
      return { ok: false, error: 'quiz: toda questão precisa de enunciado' };
    if (!Array.isArray(qq.alternativas) || qq.alternativas.length < 2)
      return { ok: false, error: 'quiz: cada questão precisa de ao menos 2 alternativas' };
    if (!qq.alternativas.every((a) => typeof a === 'string' && a.trim() !== ''))
      return { ok: false, error: 'quiz: alternativas não podem ser vazias' };
    if (typeof qq.corretaIdx !== 'number' || !Number.isInteger(qq.corretaIdx) || qq.corretaIdx < 0 || qq.corretaIdx >= qq.alternativas.length)
      return { ok: false, error: 'quiz: marque a alternativa correta de cada questão' };
  }
  return { ok: true };
}

// Validação write-time (rider A1). RECURSIVA em `children` (defesa em profundidade — um bloco
// aninhado não pode escapar da validação). `mode` opcional (default `autosave`) preserva os
// chamadores existentes (PATCH de autosave + testes); o `publish/route.ts` chama com `'publish'`.
export function validateContentDoc(doc: unknown, mode: ValidationMode = 'autosave'): ContentCheck {
  if (!Array.isArray(doc)) return { ok: false, error: 'conteúdo deve ser um array de blocos' };
  const all: Array<{ type?: string; props?: Record<string, unknown> }> = [];
  const collect = (blocks: unknown[]): void => {
    for (const blk of blocks) {
      const block = blk as { type?: string; props?: Record<string, unknown>; children?: unknown[] };
      all.push(block);
      if (Array.isArray(block.children)) collect(block.children);
    }
  };
  collect(doc);

  // Unicidade do quiz: 1 por lição (chave de tentativa = lessonSlug, sem blockId). Contagem GLOBAL.
  if (all.filter((b) => b?.type === 'quiz').length > 1)
    return { ok: false, error: 'apenas 1 quiz por lição é permitido' };

  for (const b of all) {
    if (b?.type === 'image') {
      // URL vazia/ausente = bloco de imagem incompleto (recém-inserido, upload em andamento) → permite,
      // senão o autosave debounced rejeita (422) durante o upload. URL PRESENTE deve ser http(s) seguro
      // (bloqueia javascript:/data:/etc.); o whitelist de leitura (RenderBlocks) é a defesa final.
      const url = (b.props as { url?: unknown } | undefined)?.url;
      const incompleta = url === undefined || url === null || url === '';
      if (!incompleta && !isSafeHttpUrl(url)) return { ok: false, error: 'imagem: URL deve ser http(s)' };
    }
    if (b?.type === 'embed') {
      // URL vazia/ausente = embed recém-inserido (autor ainda não colou o link) → permite,
      // senão o autosave debounced rejeita (422) entre inserir o bloco e colar a URL — mesma
      // leniência do bloco de imagem acima. URL PRESENTE deve ser embed de host na allowlist;
      // o whitelist de leitura (RenderBlocks/isAllowedEmbed) é a defesa final.
      const url = (b.props as { url?: unknown } | undefined)?.url;
      const incompleta = url === undefined || url === null || url === '';
      if (!incompleta && !isAllowedEmbed(url)) return { ok: false, error: 'embed: só YouTube/Vimeo/Stream' };
    }
    if (b?.type === 'quiz') {
      const check = validateQuizBlock(b.props, mode);
      if (!check.ok) return check;
    }
  }
  return { ok: true };
}
