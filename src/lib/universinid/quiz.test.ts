import { describe, it, expect } from 'vitest';
import { correctQuiz, extractQuizBlock, parseQuestoesForEditor, emptyQuestao, QuizDataError } from './quiz';
import type { Questao } from './content-types';

const QUESTOES: Questao[] = [
  { enunciado: 'P1', alternativas: ['a', 'b', 'c'], corretaIdx: 1, explicacao: 'é a b' },
  { enunciado: 'P2', alternativas: ['x', 'y'], corretaIdx: 0 },
];

describe('correctQuiz', () => {
  it('calcula score % e passed; feedback NÃO contém corretaIdx; snapshot é completo', () => {
    const r = correctQuiz([1, 1], QUESTOES, 70); // acerta P1, erra P2 → 50%
    expect(r.score).toBe(50);
    expect(r.passed).toBe(false);
    // feedback ao aluno: só acertou + explicacao, sem corretaIdx cru
    expect(JSON.stringify(r.feedback)).not.toContain('corretaIdx');
    expect(r.feedback.itens[0]).toEqual({ acertou: true, explicacao: 'é a b' });
    expect(r.feedback.itens[1]).toEqual({ acertou: false });
    // snapshot (só banco) carrega o gabarito
    expect(r.snapshot.notaCorte).toBe(70);
    expect(r.snapshot.itens[0]).toMatchObject({ escolhidaIdx: 1, corretaIdx: 1, acertou: true });
  });

  it('passed no LIMITE exato da nota de corte', () => {
    expect(correctQuiz([1, 0], QUESTOES, 100).passed).toBe(true);   // 100% >= 100
    expect(correctQuiz([1, 1], QUESTOES, 50).passed).toBe(true);    // 50% >= 50
    expect(correctQuiz([1, 1], QUESTOES, 51).passed).toBe(false);   // 50% < 51
  });

  it('resposta ausente conta como erro (escolhidaIdx -1)', () => {
    const r = correctQuiz([1], QUESTOES, 50); // P2 sem resposta
    expect(r.snapshot.itens[1]).toMatchObject({ escolhidaIdx: -1, acertou: false });
  });
});

describe('extractQuizBlock', () => {
  const quizBlock = (questoes: unknown, notaCorte = 70) =>
    ({ id: 'q', type: 'quiz', props: { notaCorte, questoesJson: JSON.stringify(questoes) } });

  it('localiza o bloco quiz e devolve questoes + notaCorte', () => {
    const doc = [{ type: 'paragraph', id: 'p', props: {} }, quizBlock(QUESTOES, 80)];
    const out = extractQuizBlock(doc);
    expect(out?.notaCorte).toBe(80);
    expect(out?.questoes).toHaveLength(2);
    expect(out?.questoes[0].corretaIdx).toBe(1);
  });

  it('null quando não há bloco quiz', () => {
    expect(extractQuizBlock([{ type: 'paragraph', id: 'p', props: {} }])).toBeNull();
    expect(extractQuizBlock(null)).toBeNull();
  });

  it('localiza quiz ANINHADO em children (recursivo)', () => {
    const doc = [{ type: 'paragraph', id: 'p', props: {}, children: [quizBlock(QUESTOES)] }];
    expect(extractQuizBlock(doc)?.questoes).toHaveLength(2);
  });

  it('LANÇA QuizDataError em questoesJson corrompido (nunca engole → rota responde 422)', () => {
    const doc = [{ id: 'q', type: 'quiz', props: { questoesJson: '{quebrado' } }];
    expect(() => extractQuizBlock(doc)).toThrow(QuizDataError);
  });
  it('LANÇA QuizDataError se uma questão não tem corretaIdx válido (gabarito corrompido → 422, não score 0 silencioso)', () => {
    const semGabarito = [{ enunciado: 'P', alternativas: ['a', 'b'] }]; // sem corretaIdx
    const doc = [{ id: 'q', type: 'quiz', props: { questoesJson: JSON.stringify(semGabarito) } }];
    expect(() => extractQuizBlock(doc)).toThrow(QuizDataError);
  });
});

describe('parseQuestoesForEditor (round-trip da autoria)', () => {
  it('round-trip: Questao[] → JSON → parse preserva o shape', () => {
    const out = parseQuestoesForEditor(JSON.stringify(QUESTOES));
    expect(out).toEqual(QUESTOES);
  });
  it('tolera JSON inválido (não lança) → []', () => {
    expect(parseQuestoesForEditor('{quebrado')).toEqual([]);
    expect(parseQuestoesForEditor(undefined)).toEqual([]);
  });
  it('preenche defaults p/ questão incompleta (≥2 alternativas, corretaIdx 0)', () => {
    const out = parseQuestoesForEditor(JSON.stringify([{ enunciado: 'só isso' }]));
    expect(out[0]).toEqual({ enunciado: 'só isso', alternativas: ['', ''], corretaIdx: 0 });
  });
  it('emptyQuestao cria questão em branco com 2 alternativas', () => {
    expect(emptyQuestao()).toEqual({ enunciado: '', alternativas: ['', ''], corretaIdx: 0 });
  });
});
