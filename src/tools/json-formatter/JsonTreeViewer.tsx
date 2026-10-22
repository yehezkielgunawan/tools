import { ChevronDown, ChevronRight } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { buildJsonTree, type JsonTreeNode } from './jsonTreeUtils';

interface TreeNodeProps {
  node: JsonTreeNode;
  expanded: Set<number>;
  onToggle: (id: number) => void;
  prefix: string;
}

function TreeNode({ node, expanded, onToggle, prefix }: TreeNodeProps) {
  const open = expanded.has(node.id);
  const expandable = Boolean(node.children?.length);
  const summary = node.children
    ? `${node.kind} · ${node.size} ${node.size === 1 ? 'item' : 'items'}`
    : node.kind;
  const label = <span className="break-all font-medium">{node.label}</span>;
  const type = (
    <span className="shrink-0 text-xs text-base-content/60">{summary}</span>
  );
  return (
    <li className="min-w-0">
      {expandable ? (
        <button
          aria-controls={open ? `${prefix}-${node.id}` : undefined}
          aria-expanded={open}
          className="flex w-full items-start gap-2 rounded px-1 py-1.5 text-left hover:bg-base-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          onClick={() => onToggle(node.id)}
          type="button"
        >
          {open ? (
            <ChevronDown
              aria-hidden="true"
              className="mt-0.5 shrink-0"
              size={14}
            />
          ) : (
            <ChevronRight
              aria-hidden="true"
              className="mt-0.5 shrink-0"
              size={14}
            />
          )}
          {label}
          {type}
        </button>
      ) : (
        <div className="flex flex-wrap items-baseline gap-2 py-1.5 pl-5">
          {label}
          <span
            className={
              node.kind === 'string'
                ? 'break-all whitespace-pre-wrap text-success'
                : node.kind === 'number'
                  ? 'break-all text-info'
                  : 'break-all text-base-content'
            }
          >
            {node.children
              ? node.kind === 'array'
                ? node.size
                  ? '[…]'
                  : '[]'
                : node.size
                  ? '{…}'
                  : '{}'
              : node.display}
          </span>
          {type}
        </div>
      )}
      {expandable && open ? (
        <ul
          className="ml-2 space-y-0.5 border-l border-base-300 pl-3"
          id={`${prefix}-${node.id}`}
        >
          {node.children?.map((child) => (
            <TreeNode
              expanded={expanded}
              key={child.id}
              node={child}
              onToggle={onToggle}
              prefix={prefix}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function JsonTreeViewer({ value }: { value: unknown }) {
  const tree = useMemo(() => buildJsonTree(value), [value]);
  const [expanded, setExpanded] = useState(() => new Set([0]));
  const prefix = useId();
  function toggle(id: number) {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        <button
          className="btn btn-ghost btn-xs"
          disabled={!tree.branchIds.length}
          onClick={() => setExpanded(new Set(tree.branchIds))}
          type="button"
        >
          Expand all
        </button>
        <button
          className="btn btn-ghost btn-xs"
          disabled={!tree.branchIds.length}
          onClick={() => setExpanded(new Set())}
          type="button"
        >
          Collapse all
        </button>
      </div>
      <ul className="font-mono text-sm leading-6">
        <TreeNode
          expanded={expanded}
          node={tree.root}
          onToggle={toggle}
          prefix={prefix}
        />
      </ul>
      {tree.truncated ? (
        <p className="text-sm leading-6 text-base-content/65">
          Preview is limited to 2,000 nodes, 50 nesting levels, and 300
          characters per key or string. The full JSON remains in the editor.
        </p>
      ) : null}
    </div>
  );
}
