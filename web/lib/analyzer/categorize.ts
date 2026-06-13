import type { Category, GraphNode } from "../types";

interface Rule {
  category: Category;
  test: (id: string, label: string) => boolean;
}

const RULES: Rule[] = [
  {
    category: "test",
    test: (id) =>
      /(\.|_|-)(test|spec)\.|(^|\/)(tests?|__tests__|spec)(\/|$)/i.test(id),
  },
  {
    category: "config",
    test: (id, label) =>
      /(^|\/)config(s)?\//i.test(id) ||
      /config/i.test(label) ||
      /\.(ya?ml|toml|ini)$/i.test(label) ||
      /(^|\/)(webpack|vite|rollup|babel|jest|tsconfig|eslint)[.\w-]*\.(js|ts|json|cjs|mjs)$/i.test(
        label
      ),
  },
  {
    category: "entry",
    test: (id) =>
      /^(src\/|cmd\/[\w-]+\/)?(main|index|app|server|cli|program|__main__)\.[\w]+$/i.test(
        id
      ),
  },
  {
    category: "component",
    test: (id, label) =>
      /(^|\/)components?\//i.test(id) ||
      /\.(vue|svelte)$/i.test(label) ||
      (/\.(tsx|jsx)$/i.test(label) && /^[A-Z]/.test(label)),
  },
  {
    category: "hook",
    test: (id, label) =>
      /(^|\/)hooks?\//i.test(id) || /^use[A-Z]/.test(label) || /viewmodel/i.test(label),
  },
  {
    category: "service",
    test: (id, label) =>
      /(^|\/)(services?|api|clients?)\//i.test(id) ||
      /(service|client|repository|provider)\.[\w]+$/i.test(label) ||
      /Service|Client|Repository/.test(label),
  },
  {
    category: "controller",
    test: (id, label) =>
      /(^|\/)(controllers?|handlers?|routes?|views?)\//i.test(id) ||
      /(controller|handler|route)\.[\w]+$/i.test(label) ||
      /Controller|Handler/.test(label),
  },
  {
    category: "model",
    test: (id, label) =>
      /(^|\/)(models?|entities|entity|schemas?|domain)\//i.test(id) ||
      /(model|entity|schema)\.[\w]+$/i.test(label) ||
      /Model|Entity|Schema/.test(label),
  },
  {
    category: "types",
    test: (id, label) =>
      /(^|\/)(types?|interfaces?|dtos?)\//i.test(id) ||
      /\.d\.ts$/i.test(label) ||
      /(dto|types?|interface)\.[\w]+$/i.test(label),
  },
  {
    category: "util",
    test: (id, label) =>
      /(^|\/)(utils?|lib|libs|helpers?|common|shared)\//i.test(id) ||
      /(util|utils|helper|helpers)\.[\w]+$/i.test(label),
  },
];

export function categorize(node: GraphNode): Category {
  for (const rule of RULES) if (rule.test(node.id, node.label)) return rule.category;
  return "unknown";
}

export function categorizeAll(nodes: GraphNode[]): void {
  for (const node of nodes) node.category = categorize(node);
}
