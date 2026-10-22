export interface JsonTreeNode {
  id: number;
  label: string;
  kind: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  display: string;
  size?: number;
  children?: JsonTreeNode[];
}

export function buildJsonTree(value: unknown) {
  let nodeCount = 0;
  let truncated = false;
  const branchIds: number[] = [];
  function preview(text: string): string {
    if (text.length <= 300) return text;
    truncated = true;
    return `${text.slice(0, 300)}…`;
  }
  function build(item: unknown, label: string, depth: number): JsonTreeNode {
    const id = nodeCount++;
    const kind =
      item === null ? 'null' : Array.isArray(item) ? 'array' : typeof item;
    if (kind !== 'object' && kind !== 'array') {
      return {
        id,
        label,
        kind: kind as JsonTreeNode['kind'],
        display:
          typeof item === 'string'
            ? JSON.stringify(preview(item))
            : String(item),
      };
    }
    const collection = item as Record<string, unknown> | unknown[];
    const keys = Array.isArray(collection) ? null : Object.keys(collection);
    const size = keys ? keys.length : (collection as unknown[]).length;
    const children: JsonTreeNode[] = [];
    if (size && depth >= 50) truncated = true;
    else {
      for (let index = 0; index < size; index++) {
        if (nodeCount >= 2000) {
          truncated = true;
          break;
        }
        const key = keys?.[index] ?? index;
        const child = (collection as Record<string | number, unknown>)[key];
        children.push(
          build(
            child,
            keys ? JSON.stringify(preview(String(key))) : `[${index}]`,
            depth + 1,
          ),
        );
      }
    }
    if (children.length) branchIds.push(id);
    return { id, label, kind, display: '', size, children };
  }
  const root = build(value, 'root', 0);
  return { root, nodeCount, truncated, branchIds };
}
