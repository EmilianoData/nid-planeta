import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core';
import { embedBlock } from './EmbedBlock';

// Schema do editor restrito EXATAMENTE ao conjunto que o RenderBlocks (leitura) renderiza.
// Qualquer bloco fora disto cairia no `default` do RenderBlocks e sumiria silenciosamente no
// read — então NÃO o oferecemos no editor (correto por construção). Resolve a Decisão-em-aberto
// #1 da SPEC FASE-07.1: em vez de remover só os de mídia-por-arquivo (video/audio/file), expomos
// somente o conjunto suportado, eliminando toda a classe de "bloco autorado some na leitura".
//
// Fora do schema de propósito: codeBlock, quote, table, checkListItem, divider, toggleListItem,
// video, audio, file. Habilitá-los é feature futura DELIBERADA — exige render no RenderBlocks +
// (quando houver URL) sanitize no write/read + teste, em conjunto. Alinha com a spec de design,
// que promete blocos texto, imagem e vídeo (embed) (quiz depois).
export const editorSchema = BlockNoteSchema.create({
  blockSpecs: {
    paragraph: defaultBlockSpecs.paragraph,
    heading: defaultBlockSpecs.heading,
    bulletListItem: defaultBlockSpecs.bulletListItem,
    numberedListItem: defaultBlockSpecs.numberedListItem,
    image: defaultBlockSpecs.image,
    // embedBlock é uma factory (createReactBlockSpec retorna `(options?) => BlockSpec` em 0.51.4) → chamar.
    embed: embedBlock(),
  },
});

// Tipos que o editor CONSEGUE montar — usado pelo guard de load (keepEditableBlocks).
export const KNOWN_BLOCK_TYPES: string[] = ['paragraph', 'heading', 'bulletListItem', 'numberedListItem', 'image', 'embed'];
