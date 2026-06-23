import { NextRequest } from 'next/server';
import { put } from '@vercel/blob';
import { withAuth, apiResponse, apiError } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  const { error } = await withAuth(['ADMIN']);
  if (error) return error;
  const filename = request.nextUrl.searchParams.get('filename');
  const contentType = request.headers.get('content-type') ?? '';
  if (!filename) return apiError('filename é obrigatório', 400);
  if (!contentType.startsWith('image/')) return apiError('Apenas imagens', 400);
  if (!request.body) return apiError('Corpo vazio', 400);
  const MAX = 4.5 * 1024 * 1024;
  const len = Number(request.headers.get('content-length') ?? '0');
  if (len > MAX) return apiError('Imagem acima de 4,5MB — use uma menor (client-upload virá depois)', 413);
  // Bufferiza o corpo: passar o ReadableStream cru do request pro put() quebra no undici
  // ("Response body object should not be disturbed or locked") — o retry interno do @vercel/blob
  // não consegue re-ler um stream já consumido. Um ArrayBuffer é estático e re-legível.
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > MAX) return apiError('Imagem acima de 4,5MB — use uma menor (client-upload virá depois)', 413);
  try {
    const blob = await put(`universinid/${Date.now()}-${filename}`, bytes, {
      access: 'public',
      contentType,
      abortSignal: AbortSignal.timeout(15000), // falha rápido se não alcançar o Blob (ex.: rede bloqueando a saída)
    });
    return apiResponse({ url: blob.url });
  } catch (e) {
    console.error('[upload] put falhou:', e);
    return apiError(
      'Não foi possível enviar a imagem ao Blob (falha de conexão). Em dev atrás de rede corporativa o acesso ao Blob pode estar bloqueado — teste o upload em um deploy de preview.',
      502,
    );
  }
}
