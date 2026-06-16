'use client';

// Carregado SEMPRE via next/dynamic({ ssr: false }) pelo LessonEditorPanel.
// Os imports do BlockNote (e seus CSS) tocam o DOM, então nunca devem rodar no servidor.
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { useCreateBlockNote, getDefaultReactSlashMenuItems, SuggestionMenuController } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { useCallback, useRef } from 'react';
import { filterSuggestionItems, insertOrUpdateBlockForSlashMenu, type PartialBlock } from '@blocknote/core';
import { isLegacyEmbed, stripIncompleteImages, keepEditableBlocks } from '@/lib/universinid/content-types';
import { editorSchema, KNOWN_BLOCK_TYPES } from './editor-schema';

async function uploadImage(file: File): Promise<string> {
  const res = await fetch(
    `/api/universinid/admin/upload?filename=${encodeURIComponent(file.name)}`,
    { method: 'POST', headers: { 'content-type': file.type }, body: file },
  );
  const json = (await res.json()) as { success: boolean; data?: { url: string }; error?: string };
  if (!json.success || !json.data) throw new Error(json.error ?? 'Falha no upload');
  return json.data.url;
}

interface LessonEditorProps {
  initial: unknown[] | undefined;
  onSave: (doc: unknown[]) => void;
}

export function LessonEditor({ initial, onSave }: LessonEditorProps) {
  // GUARD: legacy-embed NÃO é um bloco do schema do BlockNote — passá-lo como
  // initialContent faz o editor lançar/descartar. Lição ainda-legada → editor vazio + aviso.
  const legacy = isLegacyEmbed(initial);
  // Guard de load: descarta imagens sem URL (incompletas — RangeError "Index 0 out of range")
  // E qualquer bloco fora do schema (ex.: `video`/`audio`/`file`/`codeBlock` antigos, fora do
  // conjunto suportado) — senão o useCreateBlockNote quebra ao hidratar um tipo desconhecido.
  const pre = legacy ? [] : stripIncompleteImages(initial);
  const cleaned = legacy ? [] : keepEditableBlocks(pre, KNOWN_BLOCK_TYPES);
  // Avisa quando o guard removeu blocos não-suportados (de versões anteriores do editor): o
  // conteúdo suportado foi mantido e o 1º save grava a versão filtrada.
  const removeuNaoSuportado = !legacy && JSON.stringify(pre) !== JSON.stringify(cleaned);
  const editor = useCreateBlockNote({
    schema: editorSchema,
    initialContent: cleaned.length ? (cleaned as PartialBlock[]) : undefined,
    uploadFile: uploadImage,
  });

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const handleChange = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onSave(editor.document), 800); // debounce de autosave
  }, [editor, onSave]);

  return (
    <div>
      {legacy && (
        <p
          role="status"
          className="mb-3 rounded-[10px] border border-[#f0d9a8] bg-[#fff7e6] px-3 py-2 text-[.82rem] text-[#8a5a00]"
        >
          Esta lição ainda usa o conteúdo legado (HTML embutido). Comece a autorar abaixo — ao
          salvar, o conteúdo nativo substitui o embed legado.
        </p>
      )}
      {removeuNaoSuportado && (
        <p
          role="status"
          className="mb-3 rounded-[10px] border border-[#f0d9a8] bg-[#fff7e6] px-3 py-2 text-[.82rem] text-[#8a5a00]"
        >
          Alguns blocos não suportados (de versões anteriores do editor) foram ocultados. O
          conteúdo suportado foi mantido — salve para consolidar.
        </p>
      )}
      <BlockNoteView editor={editor} slashMenu={false} onChange={handleChange}>
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSuggestionItems(
              [
                ...getDefaultReactSlashMenuItems(editor),
                {
                  title: 'Vídeo (embed)',
                  subtext: 'YouTube, Vimeo ou Cloudflare Stream',
                  group: 'Mídia',
                  aliases: ['video', 'vídeo', 'youtube', 'vimeo', 'embed'],
                  // Consome a query "/video" do bloco atual (mesmo comportamento dos itens padrão);
                  // NÃO usar insertBlocks 'after' (deixaria o texto "/video" no editor).
                  onItemClick: () => {
                    insertOrUpdateBlockForSlashMenu(editor, { type: 'embed' });
                  },
                },
              ],
              query,
            )
          }
        />
      </BlockNoteView>
    </div>
  );
}
