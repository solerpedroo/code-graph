export function Loader({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="loader">
      <div className="loader__box">
        <div className="loader__orbit">
          <span />
          <span />
        </div>
        <div>
          <div className="loader__text">{text}</div>
          {sub && <div className="loader__sub">{sub}</div>}
        </div>
      </div>
    </div>
  );
}
