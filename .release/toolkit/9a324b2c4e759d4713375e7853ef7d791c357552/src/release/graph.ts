/** Internal prerequisite traversal shared by manifest validation and plan ordering. */
export function orderByPrerequisites(
  ids: string[],
  prerequisitesFor: (id: string) => string[],
): string[] {
  const included = new Set(ids);
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const ordered: string[] = [];

  function visit(id: string) {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      throw new Error(`Cyclic release prerequisites involving ${id}`);
    }
    visiting.add(id);
    for (const prerequisiteId of prerequisitesFor(id)) {
      if (included.has(prerequisiteId)) visit(prerequisiteId);
    }
    visiting.delete(id);
    visited.add(id);
    ordered.push(id);
  }

  for (const id of ids) visit(id);
  return ordered;
}
