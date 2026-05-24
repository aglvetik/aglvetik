import fs from "node:fs/promises";

const username = process.env.GITHUB_USERNAME;
const token = process.env.GITHUB_TOKEN;

const MAX_TOP_LANGUAGES = 7;
const PINNED_LANGUAGES = ["HTML", "CSS"];

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
    SCSS: "#c6538c",
    Less: "#1d365d",
    Shell: "#89e051",
    Go: "#00ADD8",
    C: "#555555",
    "C++": "#f34b7d",
    "C#": "#178600",
    Java: "#b07219",
    Kotlin: "#A97BFF",
    Swift: "#F05138",
    PHP: "#4F5D95",
    Ruby: "#701516",
    Dart: "#00B4AB",
    Lua: "#000080",
    Vue: "#41b883",
    Svelte: "#ff3e00",
    Astro: "#ff5d01",
    Dockerfile: "#384d54",
    Makefile: "#427819",
    PowerShell: "#012456",
    Batchfile: "#C1F12E",
    "Inno Setup": "#8b949e",
    Mako: "#7e858f",
    Other: "#8b949e",
  };

  return colors[language] || "#8b949e";
}

function polarToCartesian(cx, cy, r, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

function describeFullDonut(cx, cy, outerR, innerR) {
  return [
    `M ${cx} ${cy - outerR}`,
    `A ${outerR} ${outerR} 0 1 1 ${cx} ${cy + outerR}`,
    `A ${outerR} ${outerR} 0 1 1 ${cx} ${cy - outerR}`,
    `M ${cx} ${cy - innerR}`,
    `A ${innerR} ${innerR} 0 1 0 ${cx} ${cy + innerR}`,
    `A ${innerR} ${innerR} 0 1 0 ${cx} ${cy - innerR}`,
  ].join(" ");
}

function describeDonutSegment(cx, cy, outerR, innerR, startAngle, endAngle) {
  const angle = endAngle - startAngle;

  if (angle >= 359.99) {
    return describeFullDonut(cx, cy, outerR, innerR);
  }

  const startOuter = polarToCartesian(cx, cy, outerR, startAngle);
  const endOuter = polarToCartesian(cx, cy, outerR, endAngle);
  const startInner = polarToCartesian(cx, cy, innerR, startAngle);
  const endInner = polarToCartesian(cx, cy, innerR, endAngle);

  const largeArcFlag = angle > 180 ? "1" : "0";

  return [
    `M ${startOuter.x.toFixed(2)} ${startOuter.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${endOuter.x.toFixed(2)} ${endOuter.y.toFixed(2)}`,
    `L ${endInner.x.toFixed(2)} ${endInner.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${startInner.x.toFixed(2)} ${startInner.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function formatPercent(bytes, totalBytes) {
  const percent = (bytes / totalBytes) * 100;

  if (percent > 0 && percent < 0.1) {
    return "0.1%";
  }

  return `${percent.toFixed(1)}%`;
}

function buildVisibleEntries(entries) {
  const selected = [];
  const selectedNames = new Set();

  for (const entry of entries.slice(0, MAX_TOP_LANGUAGES)) {
    selected.push(entry);
    selectedNames.add(entry[0]);
  }

  for (const language of PINNED_LANGUAGES) {
    const pinnedEntry = entries.find(([name]) => name === language);

    if (pinnedEntry && !selectedNames.has(language)) {
      selected.push(pinnedEntry);
      selectedNames.add(language);
    }
  }

  selected.sort((a, b) => b[1] - a[1]);

  const otherBytes = entries
    .filter(([language]) => !selectedNames.has(language))
    .reduce((sum, [, bytes]) => sum + bytes, 0);

  if (otherBytes > 0) {
    selected.push(["Other", otherBytes]);
  }

  return selected;
}

function generateSvg(languageTotals, repoCount) {
  const entries = Object.entries(languageTotals)
    .sort((a, b) => b[1] - a[1])
    .filter(([, bytes]) => bytes > 0);

  const totalBytes = entries.reduce((sum, [, bytes]) => sum + bytes, 0);

  if (totalBytes === 0) {
    throw new Error("No language data found.");
  }

  const visibleEntries = buildVisibleEntries(entries);
  const topLanguage = entries[0][0];
  const topPercent = formatPercent(entries[0][1], totalBytes);

  const width = 760;
  const rowStartY = 137;
  const rowGap = 32;
  const bottomPadding = 54;

  const height = Math.max(
    380,
    rowStartY + visibleEntries.length * rowGap + bottomPadding
  );

  const cardX = 16;
  const cardY = 16;
  const cardW = width - 32;
  const cardH = height - 32;

  const cx = 205;
  const cy = Math.round(height / 2 + 20);
  const outerR = 94;
  const innerR = 62;

  let currentAngle = -90;

  const segmentPaths = visibleEntries
    .map(([language, bytes]) => {
      const percent = bytes / totalBytes;
      const angle = percent * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      currentAngle = endAngle;

      const path = describeDonutSegment(
        cx,
        cy,
        outerR,
        innerR,
        startAngle,
        endAngle
      );

      return `<path d="${path}" fill="${colorForLanguage(language)}" fill-rule="evenodd"/>`;
    })
    .join("\n");

  const legendRows = visibleEntries
    .map(([language, bytes], index) => {
      const percent = formatPercent(bytes, totalBytes);
      const y = rowStartY + index * rowGap;
      const color = colorForLanguage(language);
      const barWidth = Math.max(4, Math.round((bytes / totalBytes) * 170));

      return `
<g>
  <circle cx="413" cy="${y - 4}" r="5.5" fill="${color}"/>
  <text x="428" y="${y}" fill="#e6edf3" font-family="Segoe UI, Arial, sans-serif" font-size="13" font-weight="700">${escapeXml(language)}</text>
  <text x="704" y="${y}" fill="#f0f6fc" font-family="Segoe UI, Arial, sans-serif" font-size="13" font-weight="700" text-anchor="end">${escapeXml(percent)}</text>

  <rect x="428" y="${y + 9}" width="170" height="5" rx="2.5" fill="#21262d"/>
  <rect x="428" y="${y + 9}" width="${barWidth}" height="5" rx="2.5" fill="${color}"/>
</g>`;
    })
    .join("\n");

  const reposLabel = `${repoCount} repos`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="premiumBg" x1="0" y1="0" x2="${width}" y2="${height}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0d1117"/>
      <stop offset="0.55" stop-color="#0f1723"/>
      <stop offset="1" stop-color="#111827"/>
    </linearGradient>

    <linearGradient id="softGlow" x1="80" y1="40" x2="640" y2="${height}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#238636" stop-opacity="0.16"/>
      <stop offset="0.45" stop-color="#1f6feb" stop-opacity="0.10"/>
      <stop offset="1" stop-color="#8957e5" stop-opacity="0.13"/>
    </linearGradient>
  </defs>

  <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="24" fill="url(#premiumBg)" stroke="#30363d"/>
  <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="24" fill="url(#softGlow)"/>

  <rect x="36" y="36" width="688" height="58" rx="17" fill="#0d1117" fill-opacity="0.72" stroke="#21262d"/>

  <text x="58" y="62" fill="#f0f6fc" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="800">Repository language mix</text>
  <text x="58" y="80" fill="#8b949e" font-family="Segoe UI, Arial, sans-serif" font-size="12" font-weight="500">GitHub Linguist stats from public owner repositories</text>

  <rect x="560" y="49" width="70" height="26" rx="13" fill="#13233a" stroke="#27496d"/>
  <circle cx="576" cy="62" r="4" fill="#3fb950"/>
  <text x="588" y="66" fill="#c9d1d9" font-family="Segoe UI, Arial, sans-serif" font-size="12" font-weight="700">auto</text>

  <rect x="638" y="49" width="72" height="26" rx="13" fill="#161b22" stroke="#30363d"/>
  <text x="674" y="66" fill="#c9d1d9" font-family="Segoe UI, Arial, sans-serif" font-size="12" font-weight="700" text-anchor="middle">${escapeXml(reposLabel)}</text>

  <circle cx="${cx}" cy="${cy}" r="${outerR}" fill="none" stroke="#21262d" stroke-width="${outerR - innerR}"/>

  ${segmentPaths}

  <circle cx="${cx}" cy="${cy}" r="${innerR - 5}" fill="#0d1117" stroke="#21262d"/>

  <text x="${cx}" y="${cy - 10}" fill="#f0f6fc" font-family="Segoe UI, Arial, sans-serif" font-size="28" font-weight="900" text-anchor="middle">${entries.length}</text>
  <text x="${cx}" y="${cy + 13}" fill="#8b949e" font-family="Segoe UI, Arial, sans-serif" font-size="12" font-weight="700" text-anchor="middle">languages</text>

  <text x="410" y="118" fill="#8b949e" font-family="Segoe UI, Arial, sans-serif" font-size="12" font-weight="700">LANGUAGE</text>
  <text x="704" y="118" fill="#8b949e" font-family="Segoe UI, Arial, sans-serif" font-size="12" font-weight="700" text-anchor="end">SHARE</text>

  ${legendRows}

  <line x1="382" y1="102" x2="382" y2="${height - 56}" stroke="#21262d"/>

  <text x="${cx}" y="${cy + outerR + 24}" fill="#8b949e" font-family="Segoe UI, Arial, sans-serif" font-size="12" font-weight="600" text-anchor="middle">top language · ${escapeXml(topLanguage)} · ${escapeXml(topPercent)}</text>
  <text x="${cx}" y="${cy + outerR + 42}" fill="#8b949e" font-family="Segoe UI, Arial, sans-serif" font-size="12" font-weight="600" text-anchor="middle">calculated from total code volume</text>
</svg>`;
}

function printLanguageStats(languageTotals) {
  const entries = Object.entries(languageTotals)
    .sort((a, b) => b[1] - a[1])
    .filter(([, bytes]) => bytes > 0);

  const totalBytes = entries.reduce((sum, [, bytes]) => sum + bytes, 0);

  console.table(
    entries.map(([language, bytes]) => ({
      language,
      bytes,
      percent: formatPercent(bytes, totalBytes),
    }))
  );
}

async function main() {
  const repos = await getAllRepos();

  console.log(`Found ${repos.length} repositories for ${username}`);

  const languageTotals = await getLanguageStats(repos);

  printLanguageStats(languageTotals);

  await fs.mkdir("assets", { recursive: true });

  const svg = generateSvg(languageTotals, repos.length);

  await fs.writeFile("assets/languages.svg", svg, "utf8");

  console.log("Generated assets/languages.svg");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
