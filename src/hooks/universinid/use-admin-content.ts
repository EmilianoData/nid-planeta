'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { z } from 'zod';
import type {
  createCourseSchema,
  updateCourseSchema,
  createModuleSchema,
  updateModuleSchema,
  createLessonSchema,
  updateLessonSchema,
} from '@/lib/universinid/validators';
import type { UniBlockDoc } from '@/lib/universinid/content-types';

// ── Query key ──

const QUERY_KEY = ['uni-courses'] as const;

// ── Types ──

export interface LessonSummary {
  id: string;
  slug: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED';
  position: number;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  emoji: string;
  status: 'DRAFT' | 'PUBLISHED';
  position: number;
  lessons: LessonSummary[];
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  status: 'DRAFT' | 'PUBLISHED';
  position: number;
  modules: Module[];
}

// z.input<> is used for create schemas that have .default() fields (emoji, tempoMin, dificuldade)
// so those fields remain optional in the type, matching the API contract.
type CreateCourseInput = z.input<typeof createCourseSchema>;
type UpdateCourseBody = z.infer<typeof updateCourseSchema>;
type CreateModuleInput = z.input<typeof createModuleSchema>;
type UpdateModuleBody = z.infer<typeof updateModuleSchema>;
type CreateLessonInput = z.input<typeof createLessonSchema>;
type UpdateLessonBody = z.infer<typeof updateLessonSchema>;

interface ReorderItem {
  id: string;
  position: number;
}

// ── Fetch helper ──

const BASE = '/api/universinid/admin';

async function apiFetch<T>(url: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as { success: boolean; data?: T; error?: string };
  if (!res.ok || json.success === false) {
    throw new Error(json.error ?? 'Erro inesperado');
  }
  return json.data as T;
}

// ── Query: content tree ──

export function useContentTree() {
  return useQuery<Course[]>({
    queryKey: QUERY_KEY,
    queryFn: () => apiFetch<Course[]>(`${BASE}/courses`),
    staleTime: 30_000,
  });
}

// ── Hook: courses ──

export function useCoursesMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const create = useMutation({
    mutationFn: (input: CreateCourseInput) =>
      apiFetch<Course>(`${BASE}/courses`, 'POST', input),
    onSuccess: () => {
      toast.success('Curso criado com sucesso');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateCourseBody }) =>
      apiFetch<Course>(`${BASE}/courses/${id}`, 'PATCH', body),
    onSuccess: () => {
      toast.success('Curso atualizado');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ deleted: boolean }>(`${BASE}/courses/${id}`, 'DELETE'),
    onSuccess: () => {
      toast.success('Curso removido');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reorder = useMutation({
    mutationFn: (items: ReorderItem[]) =>
      apiFetch<Course[]>(`${BASE}/courses/reorder`, 'POST', { items }),
    onSuccess: () => {
      toast.success('Ordem dos cursos atualizada');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    create: (input: CreateCourseInput) => create.mutate(input),
    update: (id: string, body: UpdateCourseBody) => update.mutate({ id, body }),
    remove: (id: string) => remove.mutate(id),
    reorder: (items: ReorderItem[]) => reorder.mutate(items),
    isSaving:
      create.isPending || update.isPending || remove.isPending || reorder.isPending,
  };
}

// ── Hook: modules ──

export function useModulesMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const create = useMutation({
    mutationFn: (input: CreateModuleInput) =>
      apiFetch<Module>(`${BASE}/modules`, 'POST', input),
    onSuccess: () => {
      toast.success('Módulo criado com sucesso');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateModuleBody }) =>
      apiFetch<Module>(`${BASE}/modules/${id}`, 'PATCH', body),
    onSuccess: () => {
      toast.success('Módulo atualizado');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ deleted: boolean }>(`${BASE}/modules/${id}`, 'DELETE'),
    onSuccess: () => {
      toast.success('Módulo removido');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reorder = useMutation({
    mutationFn: ({ courseId, items }: { courseId: string; items: ReorderItem[] }) =>
      apiFetch<Module[]>(`${BASE}/modules/reorder`, 'POST', {
        parentId: courseId,
        items,
      }),
    onSuccess: () => {
      toast.success('Ordem dos módulos atualizada');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    create: (input: CreateModuleInput) => create.mutate(input),
    update: (id: string, body: UpdateModuleBody) => update.mutate({ id, body }),
    remove: (id: string) => remove.mutate(id),
    reorder: (courseId: string, items: ReorderItem[]) =>
      reorder.mutate({ courseId, items }),
    isSaving:
      create.isPending || update.isPending || remove.isPending || reorder.isPending,
  };
}

// ── Hook: lessons ──

export function useLessonsMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const create = useMutation({
    mutationFn: (input: CreateLessonInput) =>
      apiFetch<LessonSummary>(`${BASE}/lessons`, 'POST', input),
    onSuccess: () => {
      toast.success('Lição criada com sucesso');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateLessonBody }) =>
      apiFetch<LessonSummary>(`${BASE}/lessons/${id}`, 'PATCH', body),
    onSuccess: () => {
      toast.success('Lição atualizada');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ deleted: boolean }>(`${BASE}/lessons/${id}`, 'DELETE'),
    onSuccess: () => {
      toast.success('Lição removida');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reorder = useMutation({
    mutationFn: ({ moduleId, items }: { moduleId: string; items: ReorderItem[] }) =>
      apiFetch<LessonSummary[]>(`${BASE}/lessons/reorder`, 'POST', {
        parentId: moduleId,
        items,
      }),
    onSuccess: () => {
      toast.success('Ordem das lições atualizada');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const publish = useMutation({
    mutationFn: (id: string) =>
      apiFetch<LessonSummary>(`${BASE}/lessons/${id}/publish`, 'POST'),
    onSuccess: () => {
      toast.success('Lição publicada');
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveContent = useMutation({
    mutationFn: ({ id, contentDraft }: { id: string; contentDraft: UniBlockDoc }) =>
      apiFetch<LessonSummary>(`${BASE}/lessons/${id}`, 'PATCH', { contentDraft }),
    // Autosave silencioso: sem toast (dispararia a cada debounce) e sem invalidar a
    // árvore — salvar conteúdo não altera id/slug/title/status/position exibidos nela.
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    create: (input: CreateLessonInput) => create.mutate(input),
    update: (id: string, body: UpdateLessonBody) => update.mutate({ id, body }),
    remove: (id: string) => remove.mutate(id),
    reorder: (moduleId: string, items: ReorderItem[]) =>
      reorder.mutate({ moduleId, items }),
    publish: (id: string) => publish.mutate(id),
    saveContent: (id: string, contentDraft: UniBlockDoc) =>
      saveContent.mutate({ id, contentDraft }),
    isSaving:
      create.isPending ||
      update.isPending ||
      remove.isPending ||
      reorder.isPending ||
      publish.isPending ||
      saveContent.isPending,
  };
}
