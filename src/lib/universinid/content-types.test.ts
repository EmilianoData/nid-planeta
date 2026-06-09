import { describe, it, expect } from 'vitest';
import { isLegacyEmbed, legacyEmbedDoc, stripIncompleteImages, type UniBlockDoc } from './content-types';

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
