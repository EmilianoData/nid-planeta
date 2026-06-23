'use client';
import { createReactBlockSpec } from '@blocknote/react';
import { useState } from 'react';
import { isAllowedEmbed } from '@/lib/universinid/sanitize-content';
import { normalizeEmbedUrl } from '@/lib/universinid/embed-url';

// Bloco custom `embed`: type/props casam 1:1 com EmbedBlock (content-types.ts), RenderBlocks
// (case 'embed') e validateContentDoc. content:'none' (sem texto inline). SEM dangerouslySetInnerHTML —
// o preview é um <iframe> React real; a entrada de URL é um <input> controlado.
export const embedBlock = createReactBlockSpec(
  {
    type: 'embed',
    propSchema: { url: { default: '' }, provider: { default: '' } },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const url = String(block.props.url ?? '');
      if (url && isAllowedEmbed(url)) {
        return (
          <div className="uni-embed-editor" contentEditable={false}>
            <iframe
              src={url}
              title="Vídeo incorporado"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        );
      }
      // Sem URL válida ainda → formulário de colar link (controlado).
      return (
        <EmbedForm
          onConfirm={(u, p) => editor.updateBlock(block, { type: 'embed', props: { url: u, provider: p } })}
        />
      );
    },
  },
);

function EmbedForm({ onConfirm }: { onConfirm: (url: string, provider: string) => void }) {
  const [raw, setRaw] = useState('');
  const [err, setErr] = useState('');
  return (
    <div className="uni-embed-form" contentEditable={false}>
      <input
        type="url"
        aria-label="Link do vídeo (YouTube, Vimeo ou Stream)"
        placeholder="Cole o link do YouTube, Vimeo ou Cloudflare Stream"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        // Impede que ProseMirror/BlockNote capturem o teclado enquanto se digita no input.
        onKeyDown={(e) => e.stopPropagation()}
      />
      <button
        type="button"
        onClick={() => {
          const n = normalizeEmbedUrl(raw);
          if (!n) { setErr('Link não suportado. Use YouTube, Vimeo ou Cloudflare Stream.'); return; }
          setErr('');
          onConfirm(n.url, n.provider);
        }}
      >
        Inserir vídeo
      </button>
      {err ? <p role="alert" className="uni-embed-err">{err}</p> : null}
    </div>
  );
}
