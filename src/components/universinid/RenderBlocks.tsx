import { Fragment, type ReactNode } from 'react';
import { isSafeHttpUrl, isAllowedEmbed } from '@/lib/universinid/sanitize-content';
import type { UniBlock, UniBlockDoc, InlineContent } from '@/lib/universinid/content-types';

/**
 * Renderiza um documento de blocos (BlockNote) por WHITELIST — nunca
 * `dangerouslySetInnerHTML`. Cada `type` mapeia para um elemento React conhecido;
 * tipos desconhecidos degradam (warn + null). A defesa de XSS no READ (rider A2):
 * `<a href>`/`<img src>` só saem com URL http(s) segura; `embed` só com host na
 * allowlist. A mesma whitelist é aplicada recursivamente aos `children` aninhados
 * — um bloco perigoso escondido sob um parágrafo NÃO escapa.
 *
 * Robustez (red-team): o READ deve tolerar docs que NÃO passaram pelo validador de
 * escrita (seed, import futuro, escrita direta no banco). Por isso há um teto de
 * profundidade — uma cadeia de links/children muito funda ou cíclica pararia de
 * recursar em vez de estourar a pilha (RangeError → 500 na página da lição).
 */

const MAX_DEPTH = 100;

function renderText(text: string, styles: Record<string, unknown> | undefined): ReactNode {
  // Só marcas conhecidas viram elementos; o resto de `styles` é ignorado
  // (nunca espalhado como atributo — evita injeção via chave arbitrária).
  let node: ReactNode = text;
  if (styles?.code) node = <code>{node}</code>;
  if (styles?.bold) node = <strong>{node}</strong>;
  if (styles?.italic) node = <em>{node}</em>;
  if (styles?.underline) node = <u>{node}</u>;
  if (styles?.strike) node = <s>{node}</s>;
  return node;
}

function renderInline(content: InlineContent[] | undefined, depth: number): ReactNode {
  if (depth > MAX_DEPTH || !Array.isArray(content)) return null;
  return content.map((node, i) => {
    if (node?.type === 'text') {
      return <Fragment key={i}>{renderText(node.text ?? '', node.styles)}</Fragment>;
    }
    if (node?.type === 'link') {
      const inner = renderInline(node.content, depth + 1);
      // href perigoso (javascript:, data:, userinfo, etc.) → degrada para texto sem link.
      return isSafeHttpUrl(node.href) ? (
        <a key={i} href={node.href} target="_blank" rel="noopener noreferrer nofollow">{inner}</a>
      ) : (
        <span key={i}>{inner}</span>
      );
    }
    return null;
  });
}

function getChildren(block: UniBlock): UniBlock[] | undefined {
  return (block as { children?: UniBlock[] }).children;
}

function NestedChildren({ blocks, depth }: { blocks: UniBlock[] | undefined; depth: number }): ReactNode {
  if (!blocks || blocks.length === 0) return null;
  return <div className="uni-nested">{renderBlocks(blocks, depth)}</div>;
}

function renderLeaf(block: UniBlock, key: ReactNode, depth: number): ReactNode {
  const props = (block as { props?: Record<string, unknown> }).props ?? {};
  const content = (block as { content?: InlineContent[] }).content;
  const children = getChildren(block);

  switch (block.type) {
    case 'paragraph':
      return (
        <Fragment key={String(key)}>
          <p>{renderInline(content, depth)}</p>
          <NestedChildren blocks={children} depth={depth + 1} />
        </Fragment>
      );
    case 'heading': {
      const lvl = props.level === 2 ? 2 : props.level === 3 ? 3 : 1;
      const inner = renderInline(content, depth);
      const h = lvl === 1 ? <h1>{inner}</h1> : lvl === 2 ? <h2>{inner}</h2> : <h3>{inner}</h3>;
      return (
        <Fragment key={String(key)}>
          {h}
          <NestedChildren blocks={children} depth={depth + 1} />
        </Fragment>
      );
    }
    case 'image': {
      const url = props.url;
      if (!isSafeHttpUrl(url)) {
        console.warn('RenderBlocks: bloco de imagem com URL insegura/ausente ignorado');
        return null;
      }
      const caption = typeof props.caption === 'string' ? props.caption : '';
      return (
        <figure key={String(key)} className="uni-fig">
          {/* eslint-disable-next-line @next/next/no-img-element -- URL arbitrária do Blob; next/image exigiria remotePatterns por host */}
          <img src={url} alt={caption} loading="lazy" />
          {caption ? <figcaption>{caption}</figcaption> : null}
        </figure>
      );
    }
    case 'embed': {
      const url = props.url;
      if (!isAllowedEmbed(url)) {
        console.warn('RenderBlocks: embed fora da allowlist ignorado');
        return null;
      }
      return (
        <div key={String(key)} className="uni-embed">
          <iframe
            src={url as string}
            title="Vídeo incorporado"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      );
    }
    case 'legacy-embed':
      // A lição legada monta o iframe do universinid.html na própria página (5.2); aqui não há o que renderizar.
      return null;
    default:
      console.warn(`RenderBlocks: bloco de tipo desconhecido "${String(block.type)}" ignorado`);
      return null;
  }
}

function renderBlocks(blocks: UniBlock[] | undefined, depth: number): ReactNode[] {
  if (depth > MAX_DEPTH || !Array.isArray(blocks)) return [];
  const out: ReactNode[] = [];
  let i = 0;
  while (i < blocks.length) {
    const block = blocks[i];
    const type = block?.type;
    // Agrupa itens de lista consecutivos do mesmo tipo num único <ul>/<ol>.
    if (type === 'bulletListItem' || type === 'numberedListItem') {
      const items: UniBlock[] = [];
      while (i < blocks.length && blocks[i]?.type === type) {
        items.push(blocks[i]);
        i++;
      }
      const lis = items.map((it, j) => {
        const id = (it as { id?: string }).id ?? `li-${j}`;
        return (
          <li key={id}>
            {renderInline((it as { content?: InlineContent[] }).content, depth)}
            <NestedChildren blocks={getChildren(it)} depth={depth + 1} />
          </li>
        );
      });
      const listKey = `list-${i}`;
      out.push(type === 'bulletListItem' ? <ul key={listKey}>{lis}</ul> : <ol key={listKey}>{lis}</ol>);
    } else {
      const id = (block as { id?: string }).id ?? `b-${i}`;
      out.push(renderLeaf(block, id, depth));
      i++;
    }
  }
  return out;
}

export function RenderBlocks({ doc }: { doc: UniBlockDoc }) {
  return <>{renderBlocks(doc, 0)}</>;
}
