'use client';

// Carregado SEMPRE via next/dynamic({ ssr: false }) pelo LessonEditorPanel.
// Os imports do BlockNote (e seus CSS) tocam o DOM, então nunca devem rodar no servidor.
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { useCallback, useRef } from 'react';
import type { PartialBlock } from '@blocknote/core';
import { isLegacyEmbed, stripIncompleteImages } from '@/lib/universinid/content-types';

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
  // Descarta imagens sem URL (incompletas) antes de hidratar — senão o BlockNote quebra
  // (RangeError "Index 0 out of range") ao recarregar um doc com bloco de imagem vazio.
  const cleaned = legacy ? [] : stripIncompleteImages(initial);
  const editor = useCreateBlockNote({
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
      <BlockNoteView editor={editor} onChange={handleChange} />
    </div>
  );
}
