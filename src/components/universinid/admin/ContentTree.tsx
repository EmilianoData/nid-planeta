'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  useContentTree,
  useCoursesMutations,
  useModulesMutations,
  useLessonsMutations,
  type Course,
  type Module,
  type LessonSummary,
} from '@/hooks/universinid/use-admin-content';
import { AdminTabs } from './AdminTabs';
import { Button } from '@/components/universinid/ui/button';
import { Input } from '@/components/universinid/ui/input';
import { Select } from '@/components/universinid/ui/select';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/universinid/ui/dialog';

// ── Helpers ────────────────────────────────────────────────────────────────

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type Dificuldade = 'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO';

// ── Reorder helpers ─────────────────────────────────────────────────────────

function swapAndBuild<T extends { id: string }>(
  arr: T[],
  index: number,
  direction: 'up' | 'down'
): Array<{ id: string; position: number }> {
  const next = [...arr];
  const target = direction === 'up' ? index - 1 : index + 1;
  [next[index], next[target]] = [next[target], next[index]];
  return next.map((x, i) => ({ id: x.id, position: i }));
}

// ── Sub-components: dialogs ─────────────────────────────────────────────────

// Create Course
function CreateCourseDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const courses = useCoursesMutations();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [subtitle, setSubtitle] = useState('');

  function handleTitleChange(v: string) {
    setTitle(v);
    setSlug(slugify(v));
  }

  function submit() {
    if (!title.trim() || !slug.trim()) return;
    courses.create({ title: title.trim(), slug: slug.trim(), subtitle: subtitle.trim() || undefined });
    setTitle(''); setSlug(''); setSubtitle('');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Novo curso</DialogTitle>
        <DialogDescription>Preencha os dados básicos do curso.</DialogDescription>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={labelSt}>Título</label>
          <Input aria-label="Título" value={title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Ex: Fundamentos de Subsea" />
          <label style={labelSt}>Slug</label>
          <Input aria-label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="ex: fundamentos-subsea" />
          <label style={labelSt}>Subtítulo (opcional)</label>
          <Input aria-label="Subtítulo (opcional)" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Descrição curta" />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" onClick={submit} disabled={!title.trim() || !slug.trim() || courses.isSaving}>
            Criar curso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Edit Course
function EditCourseDialog({
  course,
  open,
  onOpenChange,
}: {
  course: Course | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const courses = useCoursesMutations();
  const [title, setTitle] = useState(course?.title ?? '');
  const [subtitle, setSubtitle] = useState(course?.subtitle ?? '');

  // Montado sob demanda (ver render) → useState já inicializa com o curso certo.
  const courseId = course?.id;

  function submit() {
    if (!courseId || !title.trim()) return;
    courses.update(courseId, { title: title.trim(), subtitle: subtitle.trim() || null });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Editar curso</DialogTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={labelSt}>Título</label>
          <Input aria-label="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
          <label style={labelSt}>Subtítulo (opcional)</label>
          <Input aria-label="Subtítulo (opcional)" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" onClick={submit} disabled={!title.trim() || courses.isSaving}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Create Module
function CreateModuleDialog({
  courseId,
  open,
  onOpenChange,
}: {
  courseId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const modules = useModulesMutations();
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('📘');

  function submit() {
    if (!courseId || !title.trim()) return;
    modules.create({ courseId, title: title.trim(), emoji: emoji || '📘' });
    setTitle(''); setEmoji('📘');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Novo módulo</DialogTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={labelSt}>Título</label>
          <Input aria-label="Título" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Módulo 1 – Introdução" />
          <label style={labelSt}>Emoji</label>
          <Input aria-label="Emoji" value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="📘" maxLength={4} />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" onClick={submit} disabled={!title.trim() || modules.isSaving}>Criar módulo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Edit Module
function EditModuleDialog({
  mod,
  open,
  onOpenChange,
}: {
  mod: Module | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const modules = useModulesMutations();
  const [title, setTitle] = useState(mod?.title ?? '');
  const [emoji, setEmoji] = useState(mod?.emoji ?? '📘');

  // Montado sob demanda (ver render) → useState já inicializa com o módulo certo.
  const modId = mod?.id;

  function submit() {
    if (!modId || !title.trim()) return;
    modules.update(modId, { title: title.trim(), emoji: emoji || '📘' });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Editar módulo</DialogTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={labelSt}>Título</label>
          <Input aria-label="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
          <label style={labelSt}>Emoji</label>
          <Input aria-label="Emoji" value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" onClick={submit} disabled={!title.trim() || modules.isSaving}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Create Lesson
function CreateLessonDialog({
  moduleId,
  open,
  onOpenChange,
}: {
  moduleId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const lessons = useLessonsMutations();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [tempoMin, setTempoMin] = useState('5');
  const [dificuldade, setDificuldade] = useState<Dificuldade>('INICIANTE');

  function handleTitleChange(v: string) {
    setTitle(v);
    setSlug(slugify(v));
  }

  function submit() {
    if (!moduleId || !title.trim() || !slug.trim()) return;
    lessons.create({
      moduleId,
      title: title.trim(),
      slug: slug.trim(),
      tempoMin: Number(tempoMin) || 5,
      dificuldade,
    });
    setTitle(''); setSlug(''); setTempoMin('5'); setDificuldade('INICIANTE');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Nova lição</DialogTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={labelSt}>Título</label>
          <Input aria-label="Título" value={title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Ex: Conceitos básicos" />
          <label style={labelSt}>Slug</label>
          <Input aria-label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="ex: conceitos-basicos" />
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelSt}>Tempo (min)</label>
              <Input
                aria-label="Tempo (min)"
                type="number"
                value={tempoMin}
                min={1}
                onChange={(e) => setTempoMin(e.target.value)}
              />
            </div>
            <div style={{ flex: 2 }}>
              <label style={labelSt}>Dificuldade</label>
              <Select
                aria-label="Dificuldade"
                value={dificuldade}
                onChange={(e) => setDificuldade(e.target.value as Dificuldade)}
              >
                <option value="INICIANTE">Iniciante</option>
                <option value="INTERMEDIARIO">Intermediário</option>
                <option value="AVANCADO">Avançado</option>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" onClick={submit} disabled={!title.trim() || !slug.trim() || lessons.isSaving}>
            Criar lição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Confirm Delete
function ConfirmDeleteDialog({
  label,
  open,
  onOpenChange,
  onConfirm,
}: {
  label: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Excluir item</DialogTitle>
        <DialogDescription>
          Tem certeza que deseja excluir <strong>{label}</strong>? Esta ação não pode ser desfeita.
        </DialogDescription>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="danger" size="sm" onClick={() => { onConfirm(); onOpenChange(false); }}>
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Shared style ────────────────────────────────────────────────────────────

const labelSt: React.CSSProperties = {
  fontSize: '.78rem',
  fontWeight: 650,
  color: 'var(--ink)',
  marginBottom: 2,
};

const rowSt: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  padding: '6px 0',
  borderBottom: '1px solid var(--line)',
  flexWrap: 'wrap',
};

const titleSt: React.CSSProperties = {
  flex: 1,
  fontSize: '.88rem',
  color: 'var(--ink)',
  fontWeight: 600,
  minWidth: 0,
};

// ── Main Component ──────────────────────────────────────────────────────────

type DialogState =
  | { type: 'none' }
  | { type: 'create-course' }
  | { type: 'edit-course'; course: Course }
  | { type: 'create-module'; courseId: string }
  | { type: 'edit-module'; mod: Module }
  | { type: 'create-lesson'; moduleId: string }
  | { type: 'delete'; label: string; onConfirm: () => void };

export function ContentTree() {
  const { data, isLoading, error } = useContentTree();
  const courses = useCoursesMutations();
  const modules = useModulesMutations();
  const lessons = useLessonsMutations();

  const [dialog, setDialog] = useState<DialogState>({ type: 'none' });
  const closeDialog = () => setDialog({ type: 'none' });

  const courseList = data ?? [];

  // ── render loading / error ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <main className="uni-main">
        <AdminTabs />
        <p className="uni-sub">Carregando…</p>
      </main>
    );
  }

  if (error) {
    const msg = error instanceof Error ? error.message : 'Erro ao carregar conteúdo';
    return (
      <main className="uni-main">
        <AdminTabs />
        <div className="err">{msg}</div>
      </main>
    );
  }

  return (
    <main className="uni-main">
      <AdminTabs />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <h1 className="uni-hi" style={{ margin: 0 }}>
          Conteúdo
        </h1>
        <Button size="sm" onClick={() => setDialog({ type: 'create-course' })}>
          + Novo curso
        </Button>
      </div>
      <p className="uni-sub">Gerencie cursos, módulos e lições. Arraste para reordenar ou use ↑↓.</p>

      {/* ── Courses ── */}
      <div>
        {courseList.map((course, ci) => (
          <div key={course.id} style={{ marginBottom: 12 }}>
            {/* Course row */}
            <div
              style={{
                ...rowSt,
                background: 'var(--soft)',
                borderRadius: 8,
                padding: '8px 12px',
                borderBottom: 'none',
                marginBottom: 2,
              }}
            >
              <span style={{ ...titleSt, fontSize: '.92rem' }}>{course.title}</span>
              <span className={`uni-badge ${course.status === 'PUBLISHED' ? 'on' : 'off'}`}>
                {course.status === 'PUBLISHED' ? 'Publicado' : 'Rascunho'}
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDialog({ type: 'edit-course', course })}
              >
                Editar
              </Button>
              <Button
                variant={course.status === 'PUBLISHED' ? 'outline' : 'success'}
                size="sm"
                onClick={() =>
                  courses.update(course.id, {
                    status: course.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED',
                  })
                }
              >
                {course.status === 'PUBLISHED' ? 'Despublicar' : 'Publicar'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                aria-label={`Mover curso "${course.title}" para cima`}
                disabled={ci === 0}
                onClick={() =>
                  courses.reorder(swapAndBuild(courseList, ci, 'up'))
                }
              >
                ↑
              </Button>
              <Button
                variant="outline"
                size="sm"
                aria-label={`Mover curso "${course.title}" para baixo`}
                disabled={ci === courseList.length - 1}
                onClick={() =>
                  courses.reorder(swapAndBuild(courseList, ci, 'down'))
                }
              >
                ↓
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() =>
                  setDialog({
                    type: 'delete',
                    label: course.title,
                    onConfirm: () => courses.remove(course.id),
                  })
                }
              >
                Excluir
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDialog({ type: 'create-module', courseId: course.id })}
              >
                + Módulo
              </Button>
            </div>

            {/* Modules */}
            <div style={{ marginLeft: 20 }}>
              {course.modules.map((mod, mi) => (
                <div key={mod.id} style={{ marginBottom: 4 }}>
                  {/* Module row */}
                  <div style={{ ...rowSt, background: 'var(--soft)', borderRadius: 7, padding: '6px 10px', borderBottom: 'none', marginBottom: 2 }}>
                    <span style={{ fontSize: '1rem' }}>{mod.emoji}</span>
                    <span style={titleSt}>{mod.title}</span>
                    <span className={`uni-badge ${mod.status === 'PUBLISHED' ? 'on' : 'off'}`}>
                      {mod.status === 'PUBLISHED' ? 'Publicado' : 'Rascunho'}
                    </span>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDialog({ type: 'edit-module', mod })}
                    >
                      Editar
                    </Button>
                    <Button
                      variant={mod.status === 'PUBLISHED' ? 'outline' : 'success'}
                      size="sm"
                      onClick={() =>
                        modules.update(mod.id, {
                          status: mod.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED',
                        })
                      }
                    >
                      {mod.status === 'PUBLISHED' ? 'Despublicar' : 'Publicar'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Mover módulo "${mod.title}" para cima`}
                      disabled={mi === 0}
                      onClick={() =>
                        modules.reorder(
                          course.id,
                          swapAndBuild(course.modules, mi, 'up')
                        )
                      }
                    >
                      ↑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Mover módulo "${mod.title}" para baixo`}
                      disabled={mi === course.modules.length - 1}
                      onClick={() =>
                        modules.reorder(
                          course.id,
                          swapAndBuild(course.modules, mi, 'down')
                        )
                      }
                    >
                      ↓
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() =>
                        setDialog({
                          type: 'delete',
                          label: mod.title,
                          onConfirm: () => modules.remove(mod.id),
                        })
                      }
                    >
                      Excluir
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDialog({ type: 'create-lesson', moduleId: mod.id })}
                    >
                      + Lição
                    </Button>
                  </div>

                  {/* Lessons */}
                  <div style={{ marginLeft: 20 }}>
                    {mod.lessons.map((lesson, li) => (
                      <LessonRow
                        key={lesson.id}
                        lesson={lesson}
                        index={li}
                        total={mod.lessons.length}
                        mod={mod}
                        onDelete={() =>
                          setDialog({
                            type: 'delete',
                            label: lesson.title,
                            onConfirm: () => lessons.remove(lesson.id),
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {courseList.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>
            Nenhum curso cadastrado. Clique em "+ Novo curso" para começar.
          </p>
        )}
      </div>

      {/* ── Dialogs: montados só enquanto abertos → estado fresco por alvo ── */}
      {dialog.type === 'create-course' && (
        <CreateCourseDialog open onOpenChange={(v) => { if (!v) closeDialog(); }} />
      )}
      {dialog.type === 'edit-course' && (
        <EditCourseDialog course={dialog.course} open onOpenChange={(v) => { if (!v) closeDialog(); }} />
      )}
      {dialog.type === 'create-module' && (
        <CreateModuleDialog courseId={dialog.courseId} open onOpenChange={(v) => { if (!v) closeDialog(); }} />
      )}
      {dialog.type === 'edit-module' && (
        <EditModuleDialog mod={dialog.mod} open onOpenChange={(v) => { if (!v) closeDialog(); }} />
      )}
      {dialog.type === 'create-lesson' && (
        <CreateLessonDialog moduleId={dialog.moduleId} open onOpenChange={(v) => { if (!v) closeDialog(); }} />
      )}
      {dialog.type === 'delete' && (
        <ConfirmDeleteDialog
          label={dialog.label}
          open
          onOpenChange={(v) => { if (!v) closeDialog(); }}
          onConfirm={dialog.onConfirm}
        />
      )}
    </main>
  );
}

// ── LessonRow extracted to avoid deep nesting ───────────────────────────────

function LessonRow({
  lesson,
  index,
  total,
  mod,
  onDelete,
}: {
  lesson: LessonSummary;
  index: number;
  total: number;
  mod: Module;
  onDelete: () => void;
}) {
  const lessons = useLessonsMutations();

  return (
    <div style={{ ...rowSt, borderRadius: 6, padding: '5px 8px', borderBottom: 'none', marginBottom: 1 }}>
      <span style={{ ...titleSt, fontWeight: 500, fontSize: '.85rem' }}>{lesson.title}</span>
      <span className={`uni-badge ${lesson.status === 'PUBLISHED' ? 'on' : 'off'}`}>
        {lesson.status === 'PUBLISHED' ? 'Publicada' : 'Rascunho'}
      </span>

      <Link
        href={`/universinid/admin/licao/${lesson.id}`}
        style={{ fontSize: '.78rem', color: 'var(--navy)', fontWeight: 600, textDecoration: 'none' }}
      >
        Editar conteúdo
      </Link>

      {lesson.status === 'PUBLISHED' ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => lessons.update(lesson.id, { status: 'DRAFT' })}
        >
          Despublicar
        </Button>
      ) : (
        <Button
          variant="success"
          size="sm"
          onClick={() => lessons.publish(lesson.id)}
        >
          Publicar
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        aria-label={`Mover lição "${lesson.title}" para cima`}
        disabled={index === 0}
        onClick={() =>
          lessons.reorder(mod.id, swapAndBuild(mod.lessons, index, 'up'))
        }
      >
        ↑
      </Button>
      <Button
        variant="outline"
        size="sm"
        aria-label={`Mover lição "${lesson.title}" para baixo`}
        disabled={index === total - 1}
        onClick={() =>
          lessons.reorder(mod.id, swapAndBuild(mod.lessons, index, 'down'))
        }
      >
        ↓
      </Button>
      <Button variant="danger" size="sm" onClick={onDelete}>
        Excluir
      </Button>
    </div>
  );
}
