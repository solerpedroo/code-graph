import { CATEGORY_COLORS, CATEGORY_LABELS, LANGUAGE_LABELS } from "../theme";
import type { Category, Language } from "../types";

interface Props {
  search: string;
  setSearch: (v: string) => void;

  languages: Language[];
  activeLanguages: Set<Language>;
  toggleLanguage: (l: Language) => void;

  categories: Array<{ category: Category; count: number }>;
  activeCategories: Set<Category>;
  toggleCategory: (c: Category) => void;

  onlyWarnings: boolean;
  setOnlyWarnings: (v: boolean) => void;
}

export function Filters(props: Props) {
  return (
    <div className="cg-filters">
      <div className="cg-search-wrap">
        <input
          className="cg-search"
          placeholder="Buscar arquivo..."
          value={props.search}
          onChange={(e) => props.setSearch(e.target.value)}
        />
      </div>

      <label className="cg-switch">
        <input
          type="checkbox"
          checked={props.onlyWarnings}
          onChange={(e) => props.setOnlyWarnings(e.target.checked)}
        />
        <span>Mostrar apenas warnings / ciclos</span>
      </label>

      {props.languages.length > 1 && (
        <div className="cg-group">
          <div className="cg-group__title">Linguagens</div>
          <div className="cg-chips">
            {props.languages.map((l) => (
              <button
                key={l}
                className={`cg-chip ${
                  props.activeLanguages.has(l) ? "cg-chip--on" : ""
                }`}
                onClick={() => props.toggleLanguage(l)}
              >
                {LANGUAGE_LABELS[l]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="cg-group">
        <div className="cg-group__title">Categorias</div>
        <div className="cg-legend">
          {props.categories.map(({ category, count }) => (
            <button
              key={category}
              className={`cg-legend__item ${
                props.activeCategories.has(category) ? "" : "cg-legend__item--off"
              }`}
              onClick={() => props.toggleCategory(category)}
            >
              <span
                className="cg-legend__dot"
                style={{ background: CATEGORY_COLORS[category] }}
              />
              <span className="cg-legend__label">
                {CATEGORY_LABELS[category]}
              </span>
              <span className="cg-legend__count">{count}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
