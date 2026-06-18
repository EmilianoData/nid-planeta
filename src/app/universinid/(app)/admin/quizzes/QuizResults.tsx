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
          <nav aria-label="Alunos" style={{ minWidth: 200, borderRight: '1.5px solid #ececf6', paddingRight: 12 }}>
            {resultados.map((a) => {
              const ativo = a.userId === sel;
              return (
                <button
                  key={a.userId}
                  type="button"
                  onClick={() => setSel(a.userId)}
                  aria-current={ativo ? 'true' : undefined}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px',
                    borderRadius: 8, border: 'none', cursor: 'pointer', marginBottom: 4,
                    background: ativo ? '#efedfb' : 'transparent',
                    color: a.removido ? '#9a93b8' : '#2a2550',
                    fontWeight: ativo ? 700 : 500, fontSize: '.88rem',
                  }}
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
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1.5px solid #ececf6', color: '#5e5b7a' }}>
                      <th style={{ padding: '8px 6px' }}>Lição</th>
                      <th style={{ padding: '8px 6px' }}>Melhor nota</th>
                      <th style={{ padding: '8px 6px' }}>Situação</th>
                      <th style={{ padding: '8px 6px' }}>Tentativas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aluno.licoes.map((l) => (
                      <tr key={l.slug} style={{ borderBottom: '1px solid #f3f1fa' }}>
                        <td style={{ padding: '8px 6px', color: l.lessonId ? '#2a2550' : '#9a93b8' }}>{l.titulo}</td>
                        <td style={{ padding: '8px 6px' }}>{l.melhorScore}% <span style={{ color: '#9a93b8' }}>(corte {l.notaCorte}%)</span></td>
                        <td style={{ padding: '8px 6px', color: l.aprovado ? '#0B861D' : '#cc0f10', fontWeight: 600 }}>
                          {l.aprovado ? 'Aprovado' : 'Não aprovado'}
                        </td>
                        <td style={{ padding: '8px 6px' }}>{l.totalTentativas}</td>
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
