/**
 * Petronius dialogue (Act 2). Rotates through these lines via typewriter.
 * Tone: confident, polite, brazilian, JARVIS-ish. PT-BR, no emojis.
 */
export const PETRONIUS_LINES: readonly string[] = [
  'Boas-vindas, engenheiro. Sou Petronius, sua interface com o Núcleo.',
  'Sistemas em órbita estável. Equipe NID alinhada e produtiva.',
  'Diga-me onde quer aterrissar — Sistema Solar, Pipeline ou UniversiNID.',
] as const;

/** ms per character for the typewriter. */
export const TYPE_SPEED_MS = 28;

/** ms each line stays before swapping. */
export const LINE_HOLD_MS = 2200;

/** "DESBRAVADOR ↔ INOVADOR" swap interval (ms). */
export const HERO_SWAP_MS = 4000;
