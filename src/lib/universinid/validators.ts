import { z } from 'zod';

export const HTTP_URL = z.string().url().refine((u) => /^https?:\/\//.test(u), 'URL deve ser http(s)');

export const createCourseSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'slug: minúsculas, números e hífen'),
  subtitle: z.string().optional(),
});
export const updateCourseSchema = z.object({
  title: z.string().min(1).optional(),
  subtitle: z.string().nullable().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
});

export const createModuleSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(1),
  emoji: z.string().min(1).default('📘'),
});
export const updateModuleSchema = z.object({
  title: z.string().min(1).optional(),
  emoji: z.string().min(1).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
});

export const createLessonSchema = z.object({
  moduleId: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  tempoMin: z.number().int().min(1).default(5),
  dificuldade: z.enum(['INICIANTE', 'INTERMEDIARIO', 'AVANCADO']).default('INICIANTE'),
});
export const updateLessonSchema = z.object({
  title: z.string().min(1).optional(),
  tempoMin: z.number().int().min(1).optional(),
  dificuldade: z.enum(['INICIANTE', 'INTERMEDIARIO', 'AVANCADO']).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  contentDraft: z.array(z.unknown()).optional(), // NUNCA z.any() (quebra build); sanitizado por validateContentDoc no handler
});

export const reorderSchema = z.object({
  parentId: z.string().min(1).optional(), // courseId (p/ módulos) ou moduleId (p/ lições); ausente p/ cursos
  items: z.array(z.object({ id: z.string().min(1), position: z.number().int().min(0) })).min(1),
});

export const uploadQuerySchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().regex(/^image\//, 'Apenas imagens'),
});

// Submissão de tentativa de quiz pelo aluno (FASE-08). `respostas[i]` = índice da alternativa
// escolhida na questão i (-1 / ausente = não respondeu). NUNCA recebe gabarito do cliente.
export const submitQuizSchema = z.object({
  lessonSlug: z.string().min(1),
  respostas: z.array(z.number().int()).max(200), // teto defensivo (quiz real tem poucas questões)
});
