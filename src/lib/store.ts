import { create } from 'zustand';

type Level = 'world' | 'planeta' | 'projeto';
type View = 'solar' | 'pipeline';

type State = {
  view: View;
  planetId: string | null;
  projetoId: string | null;
  cometId: string | null;
  level: Level;
  setView: (v: View) => void;
  focusPlaneta: (id: string | null) => void;
  focusProjeto: (id: string | null) => void;
  focusComet: (id: string | null) => void;
  back: () => void;
};

export const useStore = create<State>((set, get) => ({
  view: 'solar',
  planetId: null,
  projetoId: null,
  cometId: null,
  level: 'world',
  setView: (view) => set({ view }),
  focusPlaneta: (id) =>
    set({
      planetId: id,
      projetoId: null,
      cometId: null,
      level: id ? 'planeta' : 'world',
    }),
  focusProjeto: (id) =>
    set((st) => ({
      projetoId: id,
      level: id ? 'projeto' : st.planetId ? 'planeta' : 'world',
    })),
  focusComet: (id) =>
    set({
      cometId: id,
      planetId: null,
      projetoId: null,
    }),
  back: () => {
    const st = get();
    if (st.projetoId) set({ projetoId: null, level: 'planeta' });
    else if (st.planetId) set({ planetId: null, level: 'world' });
    else if (st.cometId) set({ cometId: null });
  },
}));
