import type { Questao } from './content-types';

// Erro distinguível de dado corrompido (questoesJson inválido no conteúdo PUBLICADO). A rota
// captura especificamente → 422 (e não 500), sem nunca engolir o erro de parse silenciosamente.
export class QuizDataError extends Error {}

export interface SnapshotItem {
  enunciado: string;
  alternativas: string[];
  escolhidaIdx: number;
  corretaIdx: number;
  acertou: boolean;
}
export interface FeedbackItem { acertou: boolean; explicacao?: string }
export interface Correcao {
  score: number; // 0–100
  passed: boolean;
  /** Snapshot da tentativa — gravado em QuizAttempt.answers. Inclui o gabarito; SÓ banco. */
  snapshot: { notaCorte: number; itens: SnapshotItem[] };
  /** Devolvido ao aluno — SEM corretaIdx cru (só acertou + explicação autorada). */
  feedback: { score: number; passed: boolean; itens: FeedbackItem[] };
}

/** Correção 100% server-side: o gabarito (`corretaIdx`) só aparece no snapshot, nunca no feedback. */
export function correctQuiz(respostas: number[], questoes: Questao[], notaCorte: number): Correcao {
  const itens: SnapshotItem[] = questoes.map((q, i) => {
    const escolhidaIdx = Number.isInteger(respostas[i]) ? (respostas[i] as number) : -1;
    return {
      enunciado: q.enunciado,
      alternativas: q.alternativas,
      escolhidaIdx,
      corretaIdx: q.corretaIdx,
      acertou: escolhidaIdx === q.corretaIdx,
    };
  });
  const acertos = itens.filter((i) => i.acertou).length;
  const score = questoes.length === 0 ? 0 : Math.round((acertos / questoes.length) * 100);
  const passed = score >= notaCorte;
  const feedbackItens: FeedbackItem[] = itens.map((it, i) => {
    const explicacao = questoes[i]?.explicacao;
    return explicacao ? { acertou: it.acertou, explicacao } : { acertou: it.acertou };
  });
  return { score, passed, snapshot: { notaCorte, itens }, feedback: { score, passed, itens: feedbackItens } };
}

function findQuizBlock(blocks: unknown[]): { props?: Record<string, unknown> } | null {
  for (const b of blocks) {
    const block = b as { type?: string; props?: Record<string, unknown>; children?: unknown[] };
    if (block?.type === 'quiz') return block;
    if (Array.isArray(block.children)) {
      const nested = findQuizBlock(block.children);
      if (nested) return nested;
    }
  }
  return null;
}

/**
 * Extrai o (único) bloco quiz do conteúdo PUBLICADO, server-side. Retorna `null` se não houver
 * quiz (rota → 404). LANÇA `QuizDataError` se `questoesJson` estiver corrompido (rota → 422) —
 * nunca retorna silenciosamente um array vazio que produziria score errado.
 */
export function extractQuizBlock(contentPublished: unknown): { questoes: Questao[]; notaCorte: number } | null {
  if (!Array.isArray(contentPublished)) return null;
  const block = findQuizBlock(contentPublished);
  if (!block) return null;
  const props = block.props ?? {};
  const raw = props['questoesJson'];
  let questoes: unknown;
  try {
    questoes = JSON.parse(typeof raw === 'string' ? raw : '[]');
  } catch {
    throw new QuizDataError('questoesJson inválido no conteúdo publicado');
  }
  if (!Array.isArray(questoes)) throw new QuizDataError('questoesJson não é um array');
  const notaCorte = typeof props['notaCorte'] === 'number' ? (props['notaCorte'] as number) : 70;
  return { questoes: questoes as Questao[], notaCorte };
}
