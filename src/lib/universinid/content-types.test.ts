import { describe, it, expect } from 'vitest';
import { isLegacyEmbed, keepEditableBlocks, legacyEmbedDoc, shouldBlockSave, stripIncompleteImages, stripQuizAnswers, type UniBlockDoc } from './content-types';

describe('content-types', () => {
  it('legacyEmbedDoc cria doc de 1 bloco com o screenId', () => {
    const doc = legacyEmbedDoc('s0-1');
    expect(doc).toHaveLength(1);
    expect(doc[0]).toMatchObject({ type: 'legacy-embed', props: { screenId: 's0-1' } });
  });
  it('isLegacyEmbed detecta doc legado e rejeita doc decomposto', () => {
    expect(isLegacyEmbed(legacyEmbedDoc('s1-2'))).toBe(true);
    const decomposed: UniBlockDoc = [{ id: 'b1', type: 'paragraph', props: {}, content: [{ type: 'text', text: 'oi', styles: {} }], children: [] }];
    expect(isLegacyEmbed(decomposed)).toBe(false);
  });
  it('stripIncompleteImages descarta imagem sem URL e mantém os demais blocos', () => {
    const doc = [
      { type: 'image', props: { url: '' } },
      { type: 'paragraph', props: {}, content: [], children: [] },
      { type: 'image', props: { url: 'https://blob/x.png' } },
    ];
    const out = stripIncompleteImages(doc);
    expect(out).toHaveLength(2);
    expect(out.map((b) => (b as { type?: string }).type)).toEqual(['paragraph', 'image']);
    expect(stripIncompleteImages(undefined)).toEqual([]);
  });
});

describe('keepEditableBlocks (guard de load do editor)', () => {
  const KNOWN = ['paragraph', 'heading', 'bulletListItem', 'numberedListItem', 'image', 'embed'];
  it('mantém blocos conhecidos e descarta os fora do schema (ex.: video)', () => {
    const doc = [
      { id: 'p', type: 'paragraph', props: {}, content: [] },
      { id: 'v', type: 'video', props: { url: 'https://x/y.mp4' } },
      { id: 'e', type: 'embed', props: { url: 'https://www.youtube.com/embed/x' } },
    ];
    const out = keepEditableBlocks(doc, KNOWN);
    expect(out.map((b) => (b as { type: string }).type)).toEqual(['paragraph', 'embed']);
  });
  it('recursa em children: descarta video ANINHADO (senão o hydrate crasha — Regra #4)', () => {
    const doc = [
      { id: 'p', type: 'paragraph', props: {}, content: [], children: [
        { id: 'v', type: 'video', props: { url: 'https://x/y.mp4' } },
        { id: 'h', type: 'heading', props: { level: 2 }, content: [], children: [] },
      ] },
    ];
    const out = keepEditableBlocks(doc, KNOWN) as Array<{ children: Array<{ type: string }> }>;
    expect(out[0].children.map((c) => c.type)).toEqual(['heading']);
  });
  it('array vazio/não-array → []', () => {
    expect(keepEditableBlocks(undefined, KNOWN)).toEqual([]);
    expect(keepEditableBlocks([], KNOWN)).toEqual([]);
  });
});

describe('stripQuizAnswers (remove gabarito no servidor — defesa A2)', () => {
  const QUESTOES = [
    { enunciado: 'P1', alternativas: ['a', 'b', 'c'], corretaIdx: 1, explicacao: 'porque b' },
    { enunciado: 'P2', alternativas: ['x', 'y'], corretaIdx: 0 },
  ];
  const quizDoc = (questoes: unknown): UniBlockDoc =>
    [{ id: 'q1', type: 'quiz', props: { notaCorte: 70, questoesJson: JSON.stringify(questoes) } }];

  it('remove corretaIdx/explicacao e preserva enunciado/alternativas', () => {
    const out = stripQuizAnswers(quizDoc(QUESTOES));
    const questoes = JSON.parse((out[0] as { props: { questoesJson: string } }).props.questoesJson);
    expect(questoes).toEqual([
      { enunciado: 'P1', alternativas: ['a', 'b', 'c'] },
      { enunciado: 'P2', alternativas: ['x', 'y'] },
    ]);
    expect(JSON.stringify(out)).not.toContain('corretaIdx');
    expect(JSON.stringify(out)).not.toContain('explicacao');
  });
  it('é idempotente (rodar 2x = rodar 1x)', () => {
    const once = stripQuizAnswers(quizDoc(QUESTOES));
    expect(stripQuizAnswers(once)).toEqual(once);
  });
  it('recursa em children — quiz aninhado também perde o gabarito', () => {
    const nested: UniBlockDoc = [{ id: 'p', type: 'paragraph', props: {}, children: quizDoc(QUESTOES) }];
    expect(JSON.stringify(stripQuizAnswers(nested))).not.toContain('corretaIdx');
  });
  it('tolera questoesJson inválido — neutraliza para [] sem lançar', () => {
    const bad: UniBlockDoc = [{ id: 'q', type: 'quiz', props: { questoesJson: '{quebrado' } }];
    expect(() => stripQuizAnswers(bad)).not.toThrow();
    const out = stripQuizAnswers(bad);
    expect(JSON.parse((out[0] as { props: { questoesJson: string } }).props.questoesJson)).toEqual([]);
  });
  it('não-array → []', () => { expect(stripQuizAnswers(null)).toEqual([]); });
});

describe('shouldBlockSave (guard anti-perda de quiz no deploy parcial)', () => {
  const quiz = { id: 'q', type: 'quiz', props: { questoesJson: '[]' } };
  it('bloqueia quando um quiz sumiu no load (cleaned tem menos quiz que o original)', () => {
    expect(shouldBlockSave([quiz], [])).toBe(true);
  });
  it('NÃO bloqueia quando o quiz foi preservado', () => {
    expect(shouldBlockSave([quiz], [quiz])).toBe(false);
  });
  it('NÃO bloqueia drops intencionais de blocos legados (sem quiz envolvido)', () => {
    expect(shouldBlockSave([{ type: 'video', props: {} }], [])).toBe(false);
  });
});
