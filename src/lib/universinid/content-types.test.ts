import { describe, it, expect } from 'vitest';
import { isLegacyEmbed, legacyEmbedDoc, type UniBlockDoc } from './content-types';

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
});
