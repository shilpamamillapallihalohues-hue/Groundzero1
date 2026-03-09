/**
 * Natural numeric sort for scene/shot numbers.
 * Sorts "1" < "2" < "10" < "12" < "12.B" instead of lexicographic "1" < "10" < "11" < "2"
 */
export function parseSceneNumber(s: string): { num: number; suffix: string } {
  const match = s.match(/^(-?\d+)(\.?\s*[A-Za-z]*)$/);
  if (!match) return { num: Infinity, suffix: s };
  return { num: parseFloat(match[1]), suffix: match[2] || '' };
}

export function compareSceneNumbers(a: string, b: string): number {
  const aParsed = parseSceneNumber(a);
  const bParsed = parseSceneNumber(b);
  if (aParsed.num !== bParsed.num) return aParsed.num - bParsed.num;
  return aParsed.suffix.localeCompare(bParsed.suffix);
}

/**
 * Sort an array of objects by a scene_number field using natural numeric ordering.
 */
export function sortBySceneNumber<T extends { scene_number?: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => 
    compareSceneNumbers(a.scene_number || '', b.scene_number || '')
  );
}

/**
 * Sort by shot_number field using natural numeric ordering.
 */
export function sortByShotNumber<T extends { shot_number?: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => 
    compareSceneNumbers(a.shot_number || '', b.shot_number || '')
  );
}
