export const DINOSAUR_PLATES = [
  ...["rex", "tri"].flatMap(species => ["far", "mid", "near"].flatMap(depth =>
    Array.from({ length: 4 }, (_, frame) => `${species}-${depth}-${frame}`))),
  "brachiosaurus-0",
  "rock", "root", "branch",
].map(name => ({ key: `dt-${name}`, url: `/deep-time/${name}.svg` }));

const prepared = new Map<string, HTMLImageElement>();

export async function preloadDinosaurPlates(signal: AbortSignal) {
  const results = await Promise.allSettled(DINOSAUR_PLATES.map(async ({ key, url }) => {
    const response = await fetch(url, { signal, priority: "low" });
    if (!response.ok) throw new Error(`Art asset: ${key}`);
    const svg = await response.text();
    signal.throwIfAborted();
    const image = new Image();
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await image.decode();
    signal.throwIfAborted();
    prepared.set(key, image);
  }));
  const failure = results.find(result => result.status === "rejected");
  if (failure?.status === "rejected") throw failure.reason;
}

export function takeDinosaurPlate(key: string) {
  const image = prepared.get(key);
  prepared.delete(key);
  return image;
}

export function discardDinosaurPlates() { prepared.clear(); }
