import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core';
import { embedBlock } from './EmbedBlock';

// Embed-only (design spec §"Vídeo": embed-only, nunca upload/hospedagem): removemos os blocos
// de mídia POR ARQUIVO do schema padrão (video/audio/file) — o RenderBlocks não os renderiza
// (cairiam no default → sumiriam no read). Adicionamos o bloco custom `embed`.
// NB: outros blocos não-suportados pelo RenderBlocks (codeBlock/quote/table/…) seguem como
//     Decisão-em-aberto #1 da SPEC — fora do escopo desta corretiva.
const { video, audio, file, ...keep } = defaultBlockSpecs;
void video, void audio, void file; // descartados de propósito (embed-only)

export const editorSchema = BlockNoteSchema.create({
  // embedBlock é uma factory (createReactBlockSpec retorna `(options?) => BlockSpec` em 0.51.4) → chamar.
  blockSpecs: { ...keep, embed: embedBlock() },
});

// Tipos que o editor CONSEGUE montar — usado pelo guard de load (keepEditableBlocks, tarefa 07.1.3).
export const KNOWN_BLOCK_TYPES: string[] = [...Object.keys(keep), 'embed'];
