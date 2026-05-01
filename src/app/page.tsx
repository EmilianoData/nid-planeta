import Scene from '@/components/SceneClient';
import Hud from '@/components/Hud';
import InfoPanel from '@/components/InfoPanel';
import KioskButton from '@/components/KioskButton';
import CometPanel from '@/components/CometPanel';
import PipelineView from '@/components/PipelineView';
import PipelineEntryButton from '@/components/PipelineEntryButton';

export default function Home() {
  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <Scene />
      <Hud />
      <CometPanel />
      <header className="pointer-events-none absolute top-0 left-0 right-0 px-10 py-6 z-10 flex items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-gradient-to-br from-delp-orange to-delp-yellow" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
          <div>
            <h1 className="font-display text-2xl tracking-widest">
              NID · <span className="text-delp-orange">Núcleo de Inovação</span>
            </h1>
            <p className="font-mono text-xs tracking-widest text-delp-gray uppercase mt-1">
              Sistema Solar Delp · Facilitar a vida do usuário final
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PipelineEntryButton />
          <InfoPanel />
          <KioskButton />
        </div>
      </header>
      <PipelineView />
    </main>
  );
}
