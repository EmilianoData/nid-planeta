import { describe, it, expect } from 'vitest';
import { validateContentDoc, isAllowedEmbed, isSafeHttpUrl } from './sanitize-content';
describe('validateContentDoc (XSS)', () => {
  it('rejeita image com javascript:', () => { expect(validateContentDoc([{ type: 'image', props: { url: 'javascript:alert(1)' } }]).ok).toBe(false); });
  it('rejeita image com data:', () => { expect(validateContentDoc([{ type: 'image', props: { url: 'data:text/html,<script>' } }]).ok).toBe(false); });
  it('rejeita embed de host fora da allowlist', () => { expect(validateContentDoc([{ type: 'embed', props: { url: 'https://evil.com/x' } }]).ok).toBe(false); });
  it('aceita embed YouTube e imagem https', () => { expect(validateContentDoc([{ type: 'embed', props: { url: 'https://youtube.com/embed/x' } }, { type: 'image', props: { url: 'https://blob.vercel.com/a.png' } }]).ok).toBe(true); });
  it('aceita embed incompleto (sem URL ainda) — recém-inserido antes de colar o link', () => {
    expect(validateContentDoc([{ type: 'embed', props: {} }]).ok).toBe(true);
    expect(validateContentDoc([{ type: 'embed', props: { url: '' } }]).ok).toBe(true);
  });
  it('isSafeHttpUrl rejeita javascript: e aceita https', () => { expect(isSafeHttpUrl('javascript:1')).toBe(false); expect(isSafeHttpUrl('https://x.com')).toBe(true); });
  it('isSafeHttpUrl rejeita URL com credenciais embutidas (userinfo) — deception', () => {
    expect(isSafeHttpUrl('http://www.youtube.com@evil.com/login')).toBe(false);
    expect(isAllowedEmbed('https://user:pass@player.vimeo.com/video/1')).toBe(false);
  });
  it('aceita image incompleta (sem URL ainda) — bloco recém-inserido durante o upload', () => {
    expect(validateContentDoc([{ type: 'image', props: {} }]).ok).toBe(true);
    expect(validateContentDoc([{ type: 'image', props: { url: '' } }]).ok).toBe(true);
  });
  it('ainda rejeita image com URL presente e perigosa', () => {
    expect(validateContentDoc([{ type: 'image', props: { url: 'javascript:alert(1)' } }]).ok).toBe(false);
  });
});

describe('validateContentDoc — quiz (FASE-08)', () => {
  const quiz = (questoes: unknown, notaCorte: number = 70) =>
    ({ id: 'q', type: 'quiz', props: { notaCorte, questoesJson: JSON.stringify(questoes) } });
  const Q_OK = [{ enunciado: 'Pergunta?', alternativas: ['a', 'b', 'c'], corretaIdx: 1 }];

  it('autosave: tolera quiz recém-inserido (questoesJson vazio/ausente)', () => {
    expect(validateContentDoc([{ id: 'q', type: 'quiz', props: {} }]).ok).toBe(true);
    expect(validateContentDoc([{ id: 'q', type: 'quiz', props: { questoesJson: '[]' } }]).ok).toBe(true);
  });
  it('autosave: tolera questão incompleta (sem corretaIdx marcado ainda)', () => {
    expect(validateContentDoc([quiz([{ enunciado: 'P', alternativas: ['a', 'b'] }])]).ok).toBe(true);
  });
  it('rejeita questoesJson malformado em QUALQUER modo (corrupção, nunca legítimo)', () => {
    const bad = [{ id: 'q', type: 'quiz', props: { questoesJson: '{quebrado' } }];
    expect(validateContentDoc(bad).ok).toBe(false);
    expect(validateContentDoc(bad, 'publish').ok).toBe(false);
  });
  it('rejeita mais de 1 quiz por lição — contagem GLOBAL (inclui aninhado)', () => {
    const dois = [quiz(Q_OK), { id: 'p', type: 'paragraph', props: {}, children: [quiz(Q_OK)] }];
    expect(validateContentDoc(dois).ok).toBe(false);
  });
  it('publish: rejeita quiz sem questões', () => {
    expect(validateContentDoc([quiz([])], 'publish').ok).toBe(false);
  });
  it('publish: rejeita questão com menos de 2 alternativas', () => {
    expect(validateContentDoc([quiz([{ enunciado: 'P', alternativas: ['única'], corretaIdx: 0 }])], 'publish').ok).toBe(false);
  });
  it('publish: rejeita corretaIdx fora do range', () => {
    expect(validateContentDoc([quiz([{ enunciado: 'P', alternativas: ['a', 'b'], corretaIdx: 5 }])], 'publish').ok).toBe(false);
  });
  it('publish: rejeita nota de corte fora de 1–100', () => {
    expect(validateContentDoc([quiz(Q_OK, 0)], 'publish').ok).toBe(false);
    expect(validateContentDoc([quiz(Q_OK, 150)], 'publish').ok).toBe(false);
  });
  it('publish: aceita quiz completo e válido', () => {
    expect(validateContentDoc([quiz(Q_OK, 70)], 'publish').ok).toBe(true);
  });
  it('publish: valida quiz ANINHADO em children (recursivo)', () => {
    const nested = [{ id: 'p', type: 'paragraph', props: {}, children: [quiz([{ enunciado: 'P', alternativas: ['a', 'b'], corretaIdx: 9 }])] }];
    expect(validateContentDoc(nested, 'publish').ok).toBe(false);
  });
});
