import fs from "node:fs/promises";

const username = process.env.GITHUB_USERNAME;
const token = process.env.GITHUB_TOKEN;

if (!username) {
  throw new Error("GITHUB_USERNAME is required");
}

const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "github-profile-language-stats",
};

if (token) {
  headers.Authorization = `Bearer ${token}`;
}

async function githubFetch(url) {
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`GitHub API error ${response.status}: ${url}`);
  }

  return response.json();
}

async function getAllRepos() {
  const repos = [];
  let page = 1;

  while (true) {
    const url = `https://api.github.com/users/${username}/repos?per_page=100&page=${page}&type=owner&sort=updated`;
    const batch = await githubFetch(url);

    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    repos.push(
      ...batch.filter((repo) => {
        return !repo.fork && !repo.archived;
      })
    );

    page += 1;
  }

  return repos;
}

async function getLanguageStats(repos) {
  const totals = {};

  for (const repo of repos) {
    const languages = await githubFetch(repo.languages_url);

    for (const [language, bytes] of Object.entries(languages)) {
      totals[language] = (totals[language] || 0) + bytes;
    }
  }

  return totals;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function colorForLanguage(language) {
  const colors = {
    JavaScript: "#f1e05a",
    TypeScript: "#3178c6",
    Python: "#3572A5",
    Rust: "#dea584",
    HTML: "#e34c26",
    CSS: "#563d7c",
    Shell: "#89e051",
    Go: "#00ADD8",
    C: "#555555",
    "C++": "#f34b7d",
    "C#": "#178600",
    Java: "#b07219",
    PHP: "#4F5D95",
    Ruby: "#701516",
    Dockerfile: "#384d54",
    Other: "#8b949e",
  };

  return colors[language] || "#8b949e";
}

function polarToCartesian(cx, cy, r, angleInDegrees) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;

  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

function describeDonutSegment(cx, cy, outerR, innerR, startAngle, endAngle) {
  const startOuter = polarToCartesian(cx, cy, outerR, startAngle);
  const endOuter = polarToCartesian(cx, cy, outerR, endAngle);
  const startInner = polarToCartesian(cx, cy, innerR, startAngle);
  const endInner = polarToCartesian(cx, cy, innerR, endAngle);

  const largeArcFlag = endAngle - startAngle > 180 ? "1" : "0";

  return [
    `M ${startOuter.x.toFixed(2)} ${startOuter.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${endOuter.x.toFixed(2)} ${endOuter.y.toFixed(2)}`,
    `L ${endInner.x.toFixed(2)} ${endInner.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${startInner.x.toFixed(2)} ${startInner.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function generateSvg(languageTotals) {
  const entries = Object.entries(languageTotals)
    .sort((a, b) => b[1] - a[1])
    .filter(([, bytes]) => bytes > 0);

  const totalBytes = entries.reduce((sum, [, bytes]) => sum + bytes, 0);

  if (totalBytes === 0) {
    throw new Error("No language data found.");
  }

  const visibleEntries = entries.slice(0, 6);
  const otherBytes = entries.slice(6).reduce((sum, [, bytes]) => sum + bytes, 0);

  if (otherBytes > 0) {
    visibleEntries.push(["Other", otherBytes]);
  }

  const width = 760;
  const height = 360;

  const cx = 190;
  const cy = 195;
  const outerR = 96;
  const innerR = 56;

  let currentAngle = -90;

  const segmentPaths = visibleEntries
    .map(([language, bytes]) => {
      const percent = bytes / totalBytes;
      const angle = percent * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      const path = describeDonutSegment(cx, cy, outerR, innerR, startAngle, endAngle);

      return `
  <path d="${path}" fill="${colorForLanguage(language)}" stroke="#0d1117" stroke-width="4" />
      `;
    })
    .join("\n");

  const legendRows = visibleEntries
    .map(([language, bytes], index) => {
      const percent = ((bytes / totalBytes) * 100).toFixed(1);
      const y = 92 + index * 38;
      const color = colorForLanguage(language);

      return `
  <rect x="360" y="${y}" width="330" height="30" rx="15" fill="#11161f" stroke="#283041" />
  <circle cx="382" cy="${y + 15}" r="7" fill="${color}" />
  <text x="398" y="${y + 20}" class="language">${escapeXml(language)}</text>
  <text x="670" y="${y + 20}" class="percent">${percent}%</text>
      `;
    })
    .join("\n");

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cardBg" x1="0" y1="0" x2="760" y2="360" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0d1117" />
      <stop offset="100%" stop-color="#101722" />
    </linearGradient>
  </defs>

  <style>
    .title {
      fill: #f0f6fc;
      font: 700 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .label {
      fill: #8b949e;
      font: 600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      text-anchor: middle;
    }

    .center-main {
      fill: #f0f6fc;
      font: 700 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      text-anchor: middle;
    }

    .center-sub {
      fill: #8b949e;
      font: 500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      text-anchor: middle;
    }

    .language {
      fill: #dce6f2;
      font: 600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .percent {
      fill: #ffffff;
      font: 700 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      text-anchor: end;
    }
  </style>

  <rect x="0.5" y="0.5" width="759" height="359" rx="22" fill="url(#cardBg)" stroke="#30363d" />

  <text x="28" y="38" class="title">Repository language mix</text>

  ${segmentPaths}

  <circle cx="${cx}" cy="${cy}" r="${innerR - 8}" fill="#0f141d" />

  <text x="${cx}" y="${cy - 6}" class="center-main">${visibleEntries.length}</text>
  <text x="${cx}" y="${cy + 18}" class="center-sub">languages</text>

  <text x="${cx}" y="${cy + outerR + 28}" class="label">calculated from total code volume</text>

  ${legendRows}
</svg>
`.trim();
}

async function main() {
  const repos = await getAllRepos();
  const languageTotals = await getLanguageStats(repos);

  await fs.mkdir("assets", { recursive: true });

  const svg = generateSvg(languageTotals);

  await fs.writeFile("assets/languages.svg", svg, "utf8");

  console.log("Generated assets/languages.svg");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
