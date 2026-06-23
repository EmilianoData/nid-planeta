/** Static decoration layers — purple rim blobs + dual starfield. */
export function RimBlobs() {
  return (
    <>
      <div className="rim-blob b1" aria-hidden />
      <div className="rim-blob b2" aria-hidden />
    </>
  );
}

export function Starfield() {
  return (
    <>
      <div className="starfield" aria-hidden />
      <div className="starfield b" aria-hidden />
    </>
  );
}
