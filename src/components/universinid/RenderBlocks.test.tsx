import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RenderBlocks } from './RenderBlocks';

describe('RenderBlocks (whitelist)', () => {
  it('renderiza parágrafo como <p> com o texto', () => {
    const html = renderToStaticMarkup(<RenderBlocks doc={[{ id: 'b', type: 'paragraph', props: {}, content: [{ type: 'text', text: 'olá', styles: {} }], children: [] }]} />);
    expect(html).toContain('olá');
    expect(html).toContain('<p');
  });
  it('embed vira iframe com a URL', () => {
    const html = renderToStaticMarkup(<RenderBlocks doc={[{ id: 'e', type: 'embed', props: { url: 'https://youtube.com/embed/x' } }]} />);
    expect(html).toContain('iframe');
    expect(html).toContain('youtube.com/embed/x');
  });
  it('bloco desconhecido degrada (não lança, não renderiza)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => renderToStaticMarkup(<RenderBlocks doc={[{ id: 'z', type: 'sorcery', props: {} } as never]} />)).not.toThrow();
    warn.mockRestore();
  });

  // A2 — defesa em profundidade: re-valida no READ (doc pode chegar sem passar pelo PATCH: seed, import futuro, escrita direta)
  it('NEUTRALIZA href javascript: (não emite o atributo perigoso)', () => {
    const html = renderToStaticMarkup(<RenderBlocks doc={[{ id: 'p', type: 'paragraph', props: {}, content: [{ type: 'link', href: 'javascript:alert(1)', content: [{ type: 'text', text: 'x', styles: {} }] }], children: [] }]} />);
    expect(html).not.toContain('javascript:');
  });
  it('NÃO emite iframe p/ embed de host fora da allowlist', () => {
    const html = renderToStaticMarkup(<RenderBlocks doc={[{ id: 'e', type: 'embed', props: { url: 'https://evil.com/x' } }]} />);
    expect(html).not.toContain('evil.com');
    expect(html).not.toContain('<iframe');
  });

  // Adições à spec do plano (tests originais eram todos planos / sem aninhamento):
  it('agrupa bulletListItem consecutivos numa única <ul> com um <li> por item', () => {
    const html = renderToStaticMarkup(<RenderBlocks doc={[
      { id: 'a', type: 'bulletListItem', props: {}, content: [{ type: 'text', text: 'um', styles: {} }], children: [] },
      { id: 'b', type: 'bulletListItem', props: {}, content: [{ type: 'text', text: 'dois', styles: {} }], children: [] },
    ]} />);
    expect((html.match(/<ul>/g) ?? []).length).toBe(1);
    expect((html.match(/<li>/g) ?? []).length).toBe(2);
    expect(html).toContain('um');
    expect(html).toContain('dois');
  });
  it('numberedListItem vira <ol>', () => {
    const html = renderToStaticMarkup(<RenderBlocks doc={[
      { id: 'a', type: 'numberedListItem', props: {}, content: [{ type: 'text', text: 'passo', styles: {} }], children: [] },
    ]} />);
    expect(html).toContain('<ol>');
    expect(html).toContain('passo');
  });
  it('aplica a whitelist TAMBÉM a children aninhados (image javascript: dentro de paragraph)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const html = renderToStaticMarkup(<RenderBlocks doc={[
      { id: 'p', type: 'paragraph', props: {}, content: [{ type: 'text', text: 'pai', styles: {} }], children: [
        { id: 'img', type: 'image', props: { url: 'javascript:alert(1)' } },
      ] },
    ]} />);
    expect(html).toContain('pai');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('<img');
    warn.mockRestore();
  });
  it('imagem com URL https segura emite <img>', () => {
    const html = renderToStaticMarkup(<RenderBlocks doc={[{ id: 'i', type: 'image', props: { url: 'https://x.public.blob.vercel-storage.com/a.png', caption: 'legenda' } }]} />);
    expect(html).toContain('<img');
    expect(html).toContain('a.png');
    expect(html).toContain('legenda');
  });
  it('legacy-embed não renderiza nada aqui (a página monta o iframe)', () => {
    const html = renderToStaticMarkup(<RenderBlocks doc={[{ type: 'legacy-embed', props: { screenId: 's0-1' } }]} />);
    expect(html).not.toContain('iframe');
    expect(html).not.toContain('s0-1');
  });

  // Defesa em profundidade na profundidade (red-team): a whitelist vale em QUALQUER nível.
  it('dropa image javascript: escondida 3+ níveis fundo nos children', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const html = renderToStaticMarkup(<RenderBlocks doc={[
      { id: 'p0', type: 'paragraph', props: {}, content: [], children: [
        { id: 'li', type: 'bulletListItem', props: {}, content: [], children: [
          { id: 'h', type: 'heading', props: { level: 2 }, content: [], children: [
            { id: 'evil', type: 'image', props: { url: 'javascript:alert(1)' } },
          ] },
        ] },
      ] },
    ]} />);
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('<img');
    warn.mockRestore();
  });

  // DoS (não-XSS): cadeia de links profunda/cíclica NÃO pode estourar a pilha (RangeError → 500).
  it('cadeia de links muito profunda não lança (teto de profundidade)', () => {
    let content: unknown[] = [{ type: 'text', text: 'x', styles: {} }];
    for (let d = 0; d < 5000; d++) content = [{ type: 'link', href: 'https://ok.com', content }];
    expect(() => renderToStaticMarkup(
      <RenderBlocks doc={[{ id: 'p', type: 'paragraph', props: {}, content: content as never, children: [] }]} />,
    )).not.toThrow();
  });
  it('link cíclico (content auto-referente) não lança', () => {
    const node: Record<string, unknown> = { type: 'link', href: 'https://ok.com', content: [] };
    node.content = [node];
    expect(() => renderToStaticMarkup(
      <RenderBlocks doc={[{ id: 'p', type: 'paragraph', props: {}, content: [node] as never, children: [] }]} />,
    )).not.toThrow();
  });
});
