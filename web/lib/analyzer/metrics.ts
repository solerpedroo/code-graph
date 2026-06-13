import type { GraphEdge, GraphNode } from "../types";

export interface MetricsResult {
  cycles: string[][];
}

/** Computes fan-in/out + risk and detects cycles (Tarjan SCC). Mutates nodes/edges. */
export function computeMetrics(
  nodes: GraphNode[],
  edges: GraphEdge[]
): MetricsResult {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const n of nodes) {
    n.fanIn = 0;
    n.fanOut = 0;
  }

  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);

  for (const e of edges) {
    const src = byId.get(e.source);
    const tgt = byId.get(e.target);
    if (!src || !tgt) continue;
    src.fanOut++;
    tgt.fanIn++;
    adj.get(e.source)!.push(e.target);
  }

  for (const n of nodes) n.risk = n.fanIn * n.fanOut;

  const cycles = tarjanCycles(nodes, adj);

  const inCycle = new Set<string>();
  for (const comp of cycles) for (const id of comp) inCycle.add(id);
  for (const n of nodes) n.inCycle = inCycle.has(n.id);

  const compOf = new Map<string, number>();
  cycles.forEach((comp, i) => comp.forEach((id) => compOf.set(id, i)));
  for (const e of edges) {
    const a = compOf.get(e.source);
    const b = compOf.get(e.target);
    if (a !== undefined && a === b) e.circular = true;
  }

  return { cycles };
}

function tarjanCycles(
  nodes: GraphNode[],
  adj: Map<string, string[]>
): string[][] {
  let index = 0;
  const indices = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const result: string[][] = [];

  const selfLoop = new Set<string>();
  for (const [id, targets] of adj) if (targets.includes(id)) selfLoop.add(id);

  for (const node of nodes) {
    if (indices.has(node.id)) continue;
    const work: Array<{ id: string; pi: number }> = [{ id: node.id, pi: 0 }];

    while (work.length) {
      const frame = work[work.length - 1];
      const { id } = frame;

      if (frame.pi === 0) {
        indices.set(id, index);
        lowlink.set(id, index);
        index++;
        stack.push(id);
        onStack.add(id);
      }

      const neighbors = adj.get(id) ?? [];
      if (frame.pi < neighbors.length) {
        const w = neighbors[frame.pi];
        frame.pi++;
        if (!indices.has(w)) work.push({ id: w, pi: 0 });
        else if (onStack.has(w))
          lowlink.set(id, Math.min(lowlink.get(id)!, indices.get(w)!));
      } else {
        if (lowlink.get(id) === indices.get(id)) {
          const comp: string[] = [];
          let w: string;
          do {
            w = stack.pop()!;
            onStack.delete(w);
            comp.push(w);
          } while (w !== id);
          if (comp.length > 1 || selfLoop.has(comp[0])) result.push(comp);
        }
        work.pop();
        if (work.length) {
          const parent = work[work.length - 1].id;
          lowlink.set(parent, Math.min(lowlink.get(parent)!, lowlink.get(id)!));
        }
      }
    }
  }

  return result;
}
