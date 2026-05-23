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
  };

  return colors[language] || "#8b949e";
}

function generateSvg(languageTotals) {
  const entries = Object.entries(languageTotals)
    .sort((a, b) => b[1] - a[1])
    .filter(([, bytes]) => bytes > 0);

  const totalBytes = entries.reduce((sum, [, bytes]) => sum + bytes, 0);

  if (totalBytes === 0) {
    throw new Error("No language data found.");
  }

  const visibleEntries = entries.slice(0, 8);
  const otherBytes = entries.slice(8).reduce((sum, [, bytes]) => sum + bytes, 0);

  if (otherBytes > 0) {
    visibleEntries.push(["Other", otherBytes]);
  }

  const width = 700;
  const rowHeight = 34;
  const height = 100 + visibleEntries.length * rowHeight;

  let currentX = 0;

  const barSegments = visibleEntries
    .map(([language, bytes]) => {
      const percent = bytes / totalBytes;
      const segmentWidth = Math.max(percent * (width - 40), 2);
      const x = currentX;
      currentX += segmentWidth;

      return `<rect x="${x.toFixed(2)}" y="0" width="${segmentWidth.toFixed(2)}" height="14" fill="${colorForLanguage(language)}" />`;
    })
    .join("\n");

  const rows = visibleEntries
    .map(([language, bytes], index) => {
      const percent = ((bytes / totalBytes) * 100).toFixed(1);
      const y = 112 + index * rowHeight;
      const color = colorForLanguage(language);

      return `
  <circle cx="32" cy="${y - 5}" r="6" fill="${color}" />
  <text x="50" y="${y}" class="language">${escapeXml(language)}</text>
  <text x="670" y="${y}" class="percent">${percent}%</text>`;
    })
    .join("\n");

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <style>
    .title {
      fill: #f0f6fc;
      font: 700 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .subtitle {
      fill: #8b949e;
      font: 400 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .language {
      fill: #c9d1d9;
      font: 600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .percent {
      fill: #8b949e;
      font: 600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      text-anchor: end;
    }
  </style>

  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="14" fill="#0d1117" stroke="#30363d" />

  <text x="20" y="34" class="title">Repository language mix</text>
  <text x="20" y="54" class="subtitle">Calculated by total code size across public repositories</text>

  <clipPath id="barClip">
    <rect x="20" y="70" width="${width - 40}" height="14" rx="7" />
  </clipPath>

  <g transform="translate(20, 70)" clip-path="url(#barClip)">
${barSegments}
  </g>

${rows}
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
