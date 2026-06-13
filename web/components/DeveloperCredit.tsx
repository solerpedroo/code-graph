const GITHUB = "https://github.com/solerpedroo";
const LINKEDIN = "https://www.linkedin.com/in/pedro-henrique-contardi-soler/";

export function DeveloperCredit({ compact }: { compact?: boolean }) {
  return (
    <div className={`credit ${compact ? "credit--compact" : ""}`}>
      <span className="credit__by">Developed by</span>
      <span className="credit__name">Pedro Soler</span>
      <span className="credit__sep" aria-hidden>
        ·
      </span>
      <a
        className="credit__link"
        href={GITHUB}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GitHub de Pedro Soler"
      >
        <GithubIcon />
        GitHub
      </a>
      <a
        className="credit__link"
        href={LINKEDIN}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="LinkedIn de Pedro Soler"
      >
        <LinkedInIcon />
        LinkedIn
      </a>
    </div>
  );
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05A9.36 9.36 0 0 1 12 6.84c.85 0 1.71.12 2.51.34 1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.6.69.49A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
    </svg>
  );
}
