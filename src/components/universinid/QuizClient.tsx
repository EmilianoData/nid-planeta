'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export interface QuestaoPublica { enunciado: string; alternativas: string[] }
interface FeedbackItem { acertou: boolean; explicacao?: string }
interface Resultado { score: number; passed: boolean; itens: FeedbackItem[] }

/**
 * Render interativo do quiz para o ALUNO. Recebe SÓ {enunciado, alternativas} (o gabarito foi
 * removido no servidor — stripQuizAnswers + re-validação no RenderBlocks). A correção é
 * server-side (POST /api/universinid/quiz/attempt); aqui só coletamos respostas e mostramos o
 * feedback devolvido. Tentativas ilimitadas (refazer). `modoPreview` desabilita o envio (admin).
 */
export function QuizClient({
  questoes, lessonSlug, modoPreview = false,
}: { questoes: QuestaoPublica[]; lessonSlug: string; modoPreview?: boolean }) {
  const [respostas, setRespostas] = useState<Record<number, number>>({});
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const todasRespondidas = questoes.every((_, i) => respostas[i] !== undefined);

  function enviar() {
    setErro(null);
    const arr = questoes.map((_, i) => respostas[i] ?? -1);
    start(async () => {
      try {
        const res = await fetch('/api/universinid/quiz/attempt', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ lessonSlug, respostas: arr }),
          // Fail-fast: cold start / Neon lento não pode travar a UI em "Enviando…" sem retorno.
          // O catch já trata o AbortError como erro amigável.
          signal: AbortSignal.timeout(15_000),
        });
        const json = (await res.json()) as { success: boolean; data?: Resultado; error?: string };
        if (!res.ok || !json.success || !json.data) throw new Error(json.error ?? 'Falha ao enviar o quiz.');
        setResultado(json.data);
        if (json.data.passed) router.refresh(); // revalida dashboard/lição (COMPLETED)
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao enviar. Tente novamente.');
      }
    });
  }
  function refazer() { setResultado(null); setRespostas({}); setErro(null); }

  return (
    <section className="my-4 rounded-[14px] border border-[#d9d3ee] bg-[#faf9ff] p-5" aria-label="Quiz da lição">
      <h3 className="mb-3 text-[1.05rem] font-semibold text-[#1d1840]">📝 Quiz da lição</h3>

      {questoes.map((q, qi) => {
        const fb = resultado?.itens[qi];
        return (
          <fieldset key={qi} className="mb-4 rounded-[10px] border border-[#e3def4] bg-white p-3">
            <legend className="px-1 text-[.85rem] font-medium text-[#5b51a8]">Questão {qi + 1}</legend>
            <p className="mb-2 text-[.95rem] text-[#1d1840]">{q.enunciado}</p>
            <div className="flex flex-col gap-1.5">
              {q.alternativas.map((alt, ai) => (
                <label key={ai} className="flex items-center gap-2 text-[.9rem] text-[#2a2550]">
                  <input
                    type="radio" name={`q-${qi}`} checked={respostas[qi] === ai}
                    disabled={!!resultado || pending}
                    onChange={() => setRespostas((r) => ({ ...r, [qi]: ai }))}
                  />
                  {alt}
                </label>
              ))}
            </div>
            {fb && (
              <p
                role="status"
                className={`mt-2 text-[.85rem] ${fb.acertou ? 'text-[#0B861D]' : 'text-[#cc0f10]'}`}
              >
                {fb.acertou ? '✓ Você acertou.' : '✗ Você errou.'}
                {fb.explicacao ? ` ${fb.explicacao}` : ''}
              </p>
            )}
          </fieldset>
        );
      })}

      {resultado ? (
        <div aria-live="polite">
          <p className={`text-[.95rem] font-semibold ${resultado.passed ? 'text-[#0B861D]' : 'text-[#cc0f10]'}`}>
            {resultado.passed ? `Aprovado! ${resultado.score}% de acerto.` : `Você fez ${resultado.score}%. Tente novamente.`}
          </p>
          <button type="button" onClick={refazer} className="mt-2 rounded-[8px] border border-[#cfc8ea] px-3 py-1.5 text-[.85rem] text-[#3C3489]">
            Refazer quiz
          </button>
        </div>
      ) : modoPreview ? (
        <p role="status" className="text-[.85rem] text-[#8a5a00]">Pré-visualização: envio desabilitado.</p>
      ) : (
        <button
          type="button" onClick={enviar} disabled={pending || !todasRespondidas}
          className="rounded-[8px] bg-[#3C3489] px-4 py-2 text-[.9rem] font-medium text-white disabled:opacity-40"
        >
          {pending ? 'Enviando…' : 'Enviar respostas'}
        </button>
      )}
      {erro && <p role="alert" className="mt-2 text-[.85rem] text-[#cc0f10]">{erro}</p>}
    </section>
  );
}
