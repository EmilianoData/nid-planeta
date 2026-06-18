'use client';
import { createReactBlockSpec } from '@blocknote/react';
import { useState } from 'react';
import { parseQuestoesForEditor, emptyQuestao } from '@/lib/universinid/quiz';
import type { Questao } from '@/lib/universinid/content-types';

// Bloco custom `quiz` (FASE-08). propSchema só aceita primitivos → as questões vivem como JSON
// serializado em `questoesJson`; `notaCorte` é número. content:'none' (sem texto inline). O
// gabarito (corretaIdx/explicacao) é removido no SERVIDOR (stripQuizAnswers) antes da leitura do
// aluno; aqui, na autoria do ADMIN, ele é visível e editável.
export const quizBlock = createReactBlockSpec(
  {
    type: 'quiz',
    propSchema: { notaCorte: { default: 70 }, questoesJson: { default: '[]' } },
    content: 'none',
  },
  {
    render: ({ block, editor }) => (
      <QuizBlockEditor
        notaCorteInicial={Number(block.props.notaCorte ?? 70)}
        questoesJson={String(block.props.questoesJson ?? '[]')}
        onChange={(questoes, notaCorte) =>
          editor.updateBlock(block, { type: 'quiz', props: { notaCorte, questoesJson: JSON.stringify(questoes) } })
        }
      />
    ),
  },
);

interface QuizBlockEditorProps {
  notaCorteInicial: number;
  questoesJson: string;
  onChange: (questoes: Questao[], notaCorte: number) => void;
}

// Impede que o ProseMirror/BlockNote capturem o teclado enquanto se digita nos inputs do quiz.
const stop = (e: React.KeyboardEvent) => e.stopPropagation();

function QuizBlockEditor({ notaCorteInicial, questoesJson, onChange }: QuizBlockEditorProps) {
  const [questoes, setQuestoes] = useState<Questao[]>(() => {
    const qs = parseQuestoesForEditor(questoesJson);
    return qs.length ? qs : [emptyQuestao()];
  });
  const [notaCorte, setNotaCorte] = useState<number>(() => notaCorteInicial || 70);

  function apply(qs: Questao[], nc: number) {
    setQuestoes(qs);
    setNotaCorte(nc);
    onChange(qs, nc);
  }
  const patchQuestao = (i: number, patch: Partial<Questao>) =>
    apply(questoes.map((q, j) => (j === i ? { ...q, ...patch } : q)), notaCorte);
  const setAlternativa = (qi: number, ai: number, v: string) =>
    patchQuestao(qi, { alternativas: questoes[qi]!.alternativas.map((a, j) => (j === ai ? v : a)) });
  const addAlternativa = (qi: number) =>
    patchQuestao(qi, { alternativas: [...questoes[qi]!.alternativas, ''] });
  const removeAlternativa = (qi: number, ai: number) => {
    const q = questoes[qi]!;
    if (q.alternativas.length <= 2) return; // mínimo 2
    const alternativas = q.alternativas.filter((_, j) => j !== ai);
    const corretaIdx = q.corretaIdx >= ai && q.corretaIdx > 0 ? q.corretaIdx - 1 : q.corretaIdx;
    patchQuestao(qi, { alternativas, corretaIdx });
  };

  return (
    <div contentEditable={false} className="my-2 rounded-[12px] border border-[#d9d3ee] bg-[#faf9ff] p-4 text-[#1d1840]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <strong className="text-[.95rem]">📝 Quiz da lição</strong>
        <label className="flex items-center gap-2 text-[.82rem]">
          Nota de corte (%)
          <input
            type="number" min={1} max={100} value={notaCorte}
            onKeyDown={stop}
            onChange={(e) => apply(questoes, Math.max(1, Math.min(100, Number(e.target.value) || 0)))}
            className="w-16 rounded-[8px] border border-[#cfc8ea] px-2 py-1 text-[.85rem]"
          />
        </label>
      </div>

      {questoes.map((q, qi) => (
        <fieldset key={qi} className="mb-3 rounded-[10px] border border-[#e3def4] bg-white p-3">
          <legend className="px-1 text-[.8rem] font-medium text-[#5b51a8]">Questão {qi + 1}</legend>
          <input
            type="text" value={q.enunciado} placeholder="Enunciado da pergunta"
            aria-label={`Enunciado da questão ${qi + 1}`}
            onKeyDown={stop}
            onChange={(e) => patchQuestao(qi, { enunciado: e.target.value })}
            className="mb-2 w-full rounded-[8px] border border-[#cfc8ea] px-2 py-1.5 text-[.9rem]"
          />
          <div className="flex flex-col gap-1.5">
            {q.alternativas.map((alt, ai) => (
              <div key={ai} className="flex items-center gap-2">
                <input
                  type="radio" name={`correta-${qi}`} checked={q.corretaIdx === ai}
                  aria-label={`Marcar alternativa ${ai + 1} como correta`}
                  onChange={() => patchQuestao(qi, { corretaIdx: ai })}
                />
                <input
                  type="text" value={alt} placeholder={`Alternativa ${ai + 1}`}
                  aria-label={`Texto da alternativa ${ai + 1} da questão ${qi + 1}`}
                  onKeyDown={stop}
                  onChange={(e) => setAlternativa(qi, ai, e.target.value)}
                  className="flex-1 rounded-[8px] border border-[#cfc8ea] px-2 py-1 text-[.85rem]"
                />
                <button
                  type="button" onClick={() => removeAlternativa(qi, ai)}
                  disabled={q.alternativas.length <= 2}
                  aria-label={`Remover alternativa ${ai + 1}`}
                  className="rounded-[6px] px-2 py-1 text-[.8rem] text-[#cc0f10] disabled:opacity-30"
                >✕</button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <button type="button" onClick={() => addAlternativa(qi)} className="text-[.8rem] text-[#3C3489]">+ alternativa</button>
            {questoes.length > 1 && (
              <button
                type="button" onClick={() => apply(questoes.filter((_, j) => j !== qi), notaCorte)}
                className="text-[.8rem] text-[#cc0f10]"
              >remover questão</button>
            )}
          </div>
          <input
            type="text" value={q.explicacao ?? ''} placeholder="Explicação (opcional, mostrada ao aluno após responder)"
            aria-label={`Explicação da questão ${qi + 1}`}
            onKeyDown={stop}
            onChange={(e) => patchQuestao(qi, { explicacao: e.target.value })}
            className="mt-2 w-full rounded-[8px] border border-dashed border-[#cfc8ea] px-2 py-1 text-[.82rem]"
          />
        </fieldset>
      ))}

      <button
        type="button" onClick={() => apply([...questoes, emptyQuestao()], notaCorte)}
        className="rounded-[8px] bg-[#3C3489] px-3 py-1.5 text-[.85rem] font-medium text-white"
      >+ adicionar questão</button>
    </div>
  );
}
