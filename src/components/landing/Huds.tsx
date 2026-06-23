'use client';

/** HUD ribbons. Right HUD lazy-mounts after `--p > 0.20`. */
export function HudLeft() {
  return (
    <div className="hud hud-left" data-cursor="disable">
      <div className="row">
        <span className="k">SYS</span>
        <span className="v">PETRONIUS-NID</span>
      </div>
      <div className="row">
        <span className="k">ORB</span>
        <span className="v cyan">DELP-01</span>
      </div>
      <div className="row">
        <span className="k">STA</span>
        <span className="v green blink">ONLINE</span>
      </div>
      <div className="row">
        <span className="k">EQP</span>
        <span className="v">06 NID</span>
      </div>
    </div>
  );
}

/** Right HUD — kept dormant until Act 2 reveals the bench. */
export function HudRight({ mounted }: { mounted: boolean }) {
  if (!mounted) return null;
  return (
    <div className="hud hud-right" data-cursor="disable">
      <div className="row">
        <span className="k">UPTIME</span>
        <span className="v green">99.9%</span>
      </div>
      <div className="row">
        <span className="k">EQP</span>
        <span className="v">6/6</span>
      </div>
      <div className="row">
        <span className="k">DEPLOYS</span>
        <span className="v cyan">142</span>
      </div>
      <div className="row">
        <span className="k">CAFÉ</span>
        <span className="v">∞</span>
      </div>
    </div>
  );
}
