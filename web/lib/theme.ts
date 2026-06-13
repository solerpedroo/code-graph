import type { Category, Language } from "./types";

export const ACCENT = "#d4ff4f";

export const CATEGORY_COLORS: Record<Category, string> = {
  component: "#5b8cff",
  hook: "#a972ff",
  service: "#2dd4a7",
  util: "#ffd166",
  model: "#ff7eb6",
  types: "#38d6ef",
  config: "#8a93a6",
  controller: "#ff9a52",
  test: "#6b7280",
  entry: "#ff5d5d",
  unknown: "#7c8aa3",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  component: "Componente",
  hook: "Hook / ViewModel",
  service: "Serviço / API",
  util: "Utilitário",
  model: "Modelo",
  types: "Tipos / DTO",
  config: "Configuração",
  controller: "Controller / Rota",
  test: "Teste",
  entry: "Entrypoint",
  unknown: "Outro",
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  go: "Go",
  java: "Java",
  kotlin: "Kotlin",
  ruby: "Ruby",
  php: "PHP",
  csharp: "C#",
  rust: "Rust",
  swift: "Swift",
  dart: "Dart",
  scala: "Scala",
  cpp: "C++",
  c: "C",
  unknown: "Outro",
};

export const LANGUAGE_GLYPH: Record<Language, string> = {
  javascript: "JS",
  typescript: "TS",
  python: "PY",
  go: "GO",
  java: "JV",
  kotlin: "KT",
  ruby: "RB",
  php: "PHP",
  csharp: "C#",
  rust: "RS",
  swift: "SW",
  dart: "DT",
  scala: "SC",
  cpp: "C++",
  c: "C",
  unknown: "?",
};

export function categoryColor(c: Category): string {
  return CATEGORY_COLORS[c] ?? CATEGORY_COLORS.unknown;
}
