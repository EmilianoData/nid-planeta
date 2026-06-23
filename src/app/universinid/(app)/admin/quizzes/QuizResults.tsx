'use client';

import { useState } from 'react';
import { AdminTabs } from '@/components/universinid/admin/AdminTabs';
import type { AlunoResultados } from '@/lib/universinid/quiz-results';

export function QuizResults({ resultados }: { resultados: AlunoResultados[] }) {
  const [sel, setSel] = useState<string | null>(resultados[0]?.userId ?? null);
  const aluno = resultados.find((a) => a.userId === sel) ?? null;

  return (
    <main className="uni-main">
      <AdminTabs />
      <h1 className="uni-hi">Resultados de quizzes</h1>
      <p className="uni-sub">Por aluno: a melhor nota e a aprovação em cada lição com quiz.</p>

      {resultados.length === 0 ? (
        <p className="uni-sub" role="status">Nenhuma tentativa de quiz registrada ainda.</p>
      ) : (
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Seletor de aluno */}
          <nav aria-label="Alunos" style={{ minWidth: 200, borderRight: '1.5px solid var(--line)', paddingRight: 12 }}>
            {resultados.map((a) => {
              const ativo = a.userId === sel;
              return (
                <button
                  key={a.userId}
                  type="button"
                  onClick={() => setSel(a.userId)}
                  aria-current={ativo ? 'true' : undefined}
                  className={`uni-pick ${ativo ? 'on' : ''} ${a.removido ? 'muted' : ''}`}
                >
                  {a.nome}
                </button>
              );
            })}
          </nav>

          {/* Tabela do aluno selecionado */}
          <div style={{ flex: 1, minWidth: 320 }}>
            {aluno && (
              <>
                <h2 className="uni-hi" style={{ fontSize: '1.1rem' }}>{aluno.nome}</h2>
                {aluno.email && <p className="uni-sub" style={{ marginTop: -6 }}>{aluno.email}</p>}
                <table className="uni-rtable">
                  <thead>
                    <tr>
                      <th>Lição</th>
                      <th>Melhor nota</th>
                      <th>Situação</th>
                      <th>Tentativas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aluno.licoes.map((l) => (
                      <tr key={l.slug}>
                        <td className={l.lessonId ? undefined : 'muted'}>{l.titulo}</td>
                        <td>{l.melhorScore}% <span className="muted">(corte {l.notaCorte}%)</span></td>
                        <td className={l.aprovado ? 'ok' : 'no'}>
                          {l.aprovado ? 'Aprovado' : 'Não aprovado'}
                        </td>
                        <td>{l.totalTentativas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
