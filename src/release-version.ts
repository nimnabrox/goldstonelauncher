/** Only offer a stable release newer than the running launcher. */
export function isNewerVersion(candidate: string, current: string): boolean {
  const parse = (value: string) => /^\d+\.\d+\.\d+$/.test(value)
    ? value.split('.').map(Number) : [];
  const next = parse(candidate), old = parse(current);
  if (next.length !== 3 || old.length !== 3 || [...next,...old].some(n=>!Number.isSafeInteger(n))) return false;
  for (let i=0;i<3;i++) if (next[i] !== old[i]) return next[i] > old[i];
  return false;
}
