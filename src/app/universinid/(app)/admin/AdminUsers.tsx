'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createUser, toggleUserActive } from '@/lib/universinid/actions';
import { AdminTabs } from '@/components/universinid/admin/AdminTabs';

type Row = { id: string; email: string; name: string; role: string; isActive: boolean };

const inp: React.CSSProperties = { padding: '9px 11px', border: '1.5px solid #e2e0f0', borderRadius: 8, fontSize: '.88rem' };

export function AdminUsers({ users }: { users: Row[] }) {
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  function onCreate(formData: FormData) {
    setErro(null);
    start(async () => {
      try {
        await createUser({
          email: String(formData.get('email')),
          name: String(formData.get('name')),
          password: String(formData.get('password')),
          role: (String(formData.get('role')) as 'STUDENT' | 'ADMIN') || 'STUDENT',
        });
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao criar usuário');
      }
    });
  }

  function onToggle(id: string) {
    setErro(null);
    start(async () => {
      try {
        await toggleUserActive(id);
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao alterar usuário');
      }
    });
  }

  return (
    <main className="uni-main">
      <AdminTabs />
      <h1 className="uni-hi">Gestão de usuários</h1>
      <p className="uni-sub">Crie e desative acessos. Sem auto-cadastro — você controla quem entra.</p>

      {erro && <div className="err" role="alert" style={{ marginBottom: 16 }}>{erro}</div>}

      <form action={onCreate} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24, alignItems: 'flex-end' }}>
        <div><label htmlFor="adm-name">Nome</label><br /><input id="adm-name" name="name" required style={inp} /></div>
        <div><label htmlFor="adm-email">E-mail</label><br /><input id="adm-email" name="email" type="email" required style={inp} /></div>
        <div><label htmlFor="adm-pass">Senha inicial</label><br /><input id="adm-pass" name="password" type="text" minLength={6} required style={inp} /></div>
        <div><label htmlFor="adm-role">Papel</label><br />
          <select id="adm-role" name="role" style={inp}><option value="STUDENT">Aluno</option><option value="ADMIN">Admin</option></select>
        </div>
        <button className="uni-btn" type="submit" disabled={pending}>{pending ? 'Criando…' : 'Criar usuário'}</button>
      </form>

      <table className="uni-table">
        <thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td><td>{u.email}</td><td>{u.role === 'ADMIN' ? 'Admin' : 'Aluno'}</td>
              <td><span className={`uni-badge ${u.isActive ? 'on' : 'off'}`}>{u.isActive ? 'Ativo' : 'Inativo'}</span></td>
              <td>
                <button className="uni-btn" style={{ padding: '5px 11px', fontSize: '.74rem', background: u.isActive ? '#cc0f10' : '#0B861D' }}
                  onClick={() => onToggle(u.id)} disabled={pending}>
                  {u.isActive ? 'Desativar' : 'Ativar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
