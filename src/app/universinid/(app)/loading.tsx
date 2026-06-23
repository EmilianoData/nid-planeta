// Skeleton da home enquanto o dashboard carrega (Suspense do segmento (app)).
// Espelha a estrutura: saudação + hero + faixa de stats + trilha.
export default function Loading() {
  return (
    <main className="uni-main" aria-busy="true" aria-label="Carregando">
      <div className="uni-skel uni-skel-hi" />
      <div className="uni-skel uni-skel-sub" />
      <div className="uni-skel uni-skel-hero" />
      <div className="uni-stats">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="uni-stat">
            <div className="uni-skel uni-skel-n" />
            <div className="uni-skel uni-skel-t" />
          </div>
        ))}
      </div>
      <div className="uni-skel uni-skel-sec" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="uni-skel uni-skel-node" />
      ))}
    </main>
  );
}
