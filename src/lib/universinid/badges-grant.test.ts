import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  getPublishedTreeMock,
  progressFindMany,
  badgeFindMany,
  userBadgeCreateMany,
  userBadgeFindMany,
  userBadgeCount,
} = vi.hoisted(() => ({
  getPublishedTreeMock: vi.fn(),
  progressFindMany: vi.fn(),
  badgeFindMany: vi.fn(),
  userBadgeCreateMany: vi.fn(),
  userBadgeFindMany: vi.fn(),
  userBadgeCount: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lessonProgress: { findMany: progressFindMany },
    badge: { findMany: badgeFindMany },
    userBadge: { createMany: userBadgeCreateMany, findMany: userBadgeFindMany, count: userBadgeCount },
  },
}));
vi.mock('./content-queries', () => ({ getPublishedTree: getPublishedTreeMock }));

import { grantBadges, backfillBadges, getConquistasDoUsuario, contarConquistas } from './badges-grant';

// Árvore publicada: curso c1 com módulo m1 (l1,l2) e m2 (l3).
const TREE = [
  {
    id: 'c1',
    modules: [
      { id: 'm1', lessons: [{ slug: 'l1' }, { slug: 'l2' }] },
      { id: 'm2', lessons: [{ slug: 'l3' }] },
    ],
  },
];

beforeEach(() => {
  for (const m of [getPublishedTreeMock, progressFindMany, badgeFindMany, userBadgeCreateMany, userBadgeFindMany, userBadgeCount]) {
    m.mockReset();
  }
  getPublishedTreeMock.mockResolvedValue(TREE);
  userBadgeCreateMany.mockResolvedValue({ count: 0 });
});

describe('grantBadges', () => {
  it('concede o Badge do módulo quando todas as lições do módulo estão COMPLETED', async () => {
    progressFindMany.mockResolvedValue([
      { lessonSlug: 'l1', status: 'COMPLETED' },
      { lessonSlug: 'l2', status: 'COMPLETED' },
      // l3 ausente → curso-c1 NÃO ganho; só mod-m1
    ]);
    badgeFindMany.mockResolvedValue([{ id: 'b-m1' }]);

    await grantBadges('u1');

    expect(badgeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: { in: ['mod-m1'] } } }),
    );
    expect(userBadgeCreateMany).toHaveBeenCalledWith({
      data: [{ userId: 'u1', badgeId: 'b-m1' }],
      skipDuplicates: true,
    });
  });

  // Este teste prova o MECANISMO (toda concessão usa skipDuplicates), não a PROPRIEDADE de
  // não-duplicação — o Prisma está mockado, então o índice @@unique([userId,badgeId]) e o
  // ON CONFLICT DO NOTHING não são exercidos aqui. O dedup efetivo (R2) é garantido pelo
  // @@unique no schema + semântica do skipDuplicates, e validado pelo smoke do gate F9.7
  // (concluir 2× → contagem de UserBadge não cresce).
  it('reexecutar sempre concede via createMany skipDuplicates (mecanismo de dedup)', async () => {
    progressFindMany.mockResolvedValue([
      { lessonSlug: 'l1', status: 'COMPLETED' },
      { lessonSlug: 'l2', status: 'COMPLETED' },
    ]);
    badgeFindMany.mockResolvedValue([{ id: 'b-m1' }]);

    await grantBadges('u1');
    await grantBadges('u1');

    expect(userBadgeCreateMany).toHaveBeenCalledTimes(2);
    for (const call of userBadgeCreateMany.mock.calls) {
      expect(call[0]).toMatchObject({ skipDuplicates: true });
    }
  });

  it('curso 100% concluído concede os Badges de módulo E o de curso', async () => {
    progressFindMany.mockResolvedValue([
      { lessonSlug: 'l1', status: 'COMPLETED' },
      { lessonSlug: 'l2', status: 'COMPLETED' },
      { lessonSlug: 'l3', status: 'COMPLETED' },
    ]);
    badgeFindMany.mockResolvedValue([{ id: 'b-m1' }, { id: 'b-m2' }, { id: 'b-c1' }]);

    await grantBadges('u1');

    expect(badgeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: { in: ['mod-m1', 'mod-m2', 'curso-c1'] } } }),
    );
    // Asserção por CONJUNTO: a ordem de createMany.data deriva do retorno (sem orderBy) de
    // badge.findMany, que o Postgres não garante. skipDuplicates torna a ordem inócua — o que
    // importa é QUE medalhas foram concedidas, não em que sequência.
    expect(userBadgeCreateMany).toHaveBeenCalledTimes(1);
    const arg = userBadgeCreateMany.mock.calls[0][0];
    expect(arg.skipDuplicates).toBe(true);
    expect([...arg.data].sort((a: { badgeId: string }, b: { badgeId: string }) => a.badgeId.localeCompare(b.badgeId))).toEqual([
      { userId: 'u1', badgeId: 'b-c1' },
      { userId: 'u1', badgeId: 'b-m1' },
      { userId: 'u1', badgeId: 'b-m2' },
    ]);
  });

  it('progresso parcial: nenhum alvo completo → badge.findMany e createMany NÃO rodam', async () => {
    progressFindMany.mockResolvedValue([{ lessonSlug: 'l1', status: 'COMPLETED' }]); // falta l2

    await grantBadges('u1');

    expect(badgeFindMany).not.toHaveBeenCalled();
    expect(userBadgeCreateMany).not.toHaveBeenCalled();
  });

  it('IN_PROGRESS não conta como concluída → nenhuma concessão', async () => {
    progressFindMany.mockResolvedValue([
      { lessonSlug: 'l1', status: 'COMPLETED' },
      { lessonSlug: 'l2', status: 'IN_PROGRESS' },
    ]);

    await grantBadges('u1');

    expect(userBadgeCreateMany).not.toHaveBeenCalled();
  });

  it('best-effort: erro ao gravar UserBadge NÃO propaga e é logado com contexto (latch de progresso intacto)', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    progressFindMany.mockResolvedValue([
      { lessonSlug: 'l1', status: 'COMPLETED' },
      { lessonSlug: 'l2', status: 'COMPLETED' },
    ]);
    badgeFindMany.mockResolvedValue([{ id: 'b-m1' }]);
    userBadgeCreateMany.mockRejectedValue(new Error('db down'));

    await expect(grantBadges('u1')).resolves.toBeUndefined();

    expect(errSpy).toHaveBeenCalledWith(
      '[badges:grant] falha ao conceder medalhas',
      expect.objectContaining({ userId: 'u1', err: 'db down' }),
    );
    errSpy.mockRestore();
  });

  it('slug ganho sem Badge no catálogo (seed pendente / R3): createMany NÃO roda, sem erro', async () => {
    progressFindMany.mockResolvedValue([
      { lessonSlug: 'l1', status: 'COMPLETED' },
      { lessonSlug: 'l2', status: 'COMPLETED' },
    ]);
    badgeFindMany.mockResolvedValue([]); // catálogo ainda não semeado

    await expect(grantBadges('u1')).resolves.toBeUndefined();
    expect(userBadgeCreateMany).not.toHaveBeenCalled();
  });
});

describe('backfillBadges', () => {
  it('roda grantBadges para cada userId distinto de LessonProgress (idempotente)', async () => {
    progressFindMany.mockImplementation((args?: { distinct?: string[] }) =>
      args?.distinct
        ? Promise.resolve([{ userId: 'u1' }, { userId: 'u2' }])
        : Promise.resolve([
            { lessonSlug: 'l1', status: 'COMPLETED' },
            { lessonSlug: 'l2', status: 'COMPLETED' },
          ]),
    );
    badgeFindMany.mockResolvedValue([{ id: 'b-m1' }]);
    userBadgeCreateMany.mockResolvedValue({ count: 1 });

    const res = await backfillBadges();

    expect(res).toEqual({ usuarios: 2 });
    expect(userBadgeCreateMany).toHaveBeenCalledTimes(2); // uma concessão por usuário
    expect(progressFindMany).toHaveBeenCalledWith(expect.objectContaining({ distinct: ['userId'] }));
  });
});

describe('getConquistasDoUsuario', () => {
  it('retorna catálogo ordenado + ganhos do usuário (serializável, sem Map)', async () => {
    const catalogo = [
      { id: 'b-m1', slug: 'mod-m1', nome: 'Módulo: X', escopo: 'MODULE', position: 0 },
      { id: 'b-c1', slug: 'curso-c1', nome: 'Trilha completa: Y', escopo: 'COURSE', position: 0 },
    ];
    badgeFindMany.mockResolvedValue(catalogo);
    const awardedAt = new Date('2026-06-24T00:00:00Z');
    userBadgeFindMany.mockResolvedValue([{ badgeId: 'b-m1', awardedAt }]);

    const res = await getConquistasDoUsuario('u1');

    expect(res).toEqual({ catalogo, ganhos: [{ badgeId: 'b-m1', awardedAt }] });
    expect(badgeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ escopo: 'asc' }, { position: 'asc' }] }),
    );
    expect(userBadgeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' } }),
    );
  });
});

describe('contarConquistas', () => {
  it('conta os UserBadge do usuário', async () => {
    userBadgeCount.mockResolvedValue(3);
    expect(await contarConquistas('u1')).toBe(3);
    expect(userBadgeCount).toHaveBeenCalledWith({ where: { userId: 'u1' } });
  });
});
