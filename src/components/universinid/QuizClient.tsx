'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';

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
    <section className="uni-quiz" aria-label="Quiz da lição">
      <h3>Quiz da lição</h3>

      {questoes.map((q, qi) => {
        const fb = resultado?.itens[qi];
        return (
          <fieldset key={qi} className="uni-quiz-q" aria-describedby={fb ? `uni-fb-${qi}` : undefined}>
            <legend>Questão {qi + 1}</legend>
            <p className="enun">{q.enunciado}</p>
            <div className="uni-quiz-opts">
              {q.alternativas.map((alt, ai) => (
                <label key={ai} className="uni-quiz-opt">
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
              <p id={`uni-fb-${qi}`} role="status" className={`uni-quiz-fb ${fb.acertou ? 'ok' : 'no'}`}>
                {fb.acertou ? '✓ Você acertou.' : '✗ Você errou.'}
                {fb.explicacao ? ` ${fb.explicacao}` : ''}
              </p>
            )}
          </fieldset>
        );
      })}

      {resultado ? (
        <div aria-live="polite">
          <p className={`uni-quiz-res ${resultado.passed ? 'ok' : 'no'}`}>
            {resultado.passed ? `Aprovado! ${resultado.score}% de acerto.` : `Você fez ${resultado.score}%. Tente novamente.`}
          </p>
          <Button type="button" variant="outline" onClick={refazer} className="mt-1">Refazer quiz</Button>
        </div>
      ) : modoPreview ? (
        <p role="status" className="uni-quiz-note">Pré-visualização: envio desabilitado.</p>
      ) : (
        <Button type="button" variant="default" onClick={enviar} disabled={pending || !todasRespondidas}>
          {pending ? 'Enviando…' : 'Enviar respostas'}
        </Button>
      )}
      {erro && <p role="alert" className="uni-quiz-err">{erro}</p>}
    </section>
  );
}
