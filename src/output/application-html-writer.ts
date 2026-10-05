import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ApplicationForm } from "../applications/greenhouse-form-reader.js";
import type { ApplicationAnalysis } from "../applications/application-analyzer.js";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function list(values: string[]): string {
  if (values.length === 0) return "";
  return `<ul>${values.map((v) => `<li>${escapeHtml(v)}</li>`).join("")}</ul>`;
}

export async function writeApplicationHtml(
  form: ApplicationForm,
  analysis: ApplicationAnalysis
): Promise<string> {
  const dir = join(process.cwd(), "output");
  await mkdir(dir, { recursive: true });

  const safeCompany = form.company.replace(/[^a-z0-9_-]+/gi, "-");
  const path = join(dir, `${safeCompany}-${form.jobId}-application.html`);

  const cards = analysis.answers.map((answer, index) => {
    const sourceQuestion = form.questions[index];
    const answerBlock = answer.recommendedAnswer
      ? `<div class="answer"><strong>Recommended answer</strong><p>${escapeHtml(answer.recommendedAnswer)}</p></div>`
      : "";

    return `
      <section class="card">
        <div class="meta">
          <span class="badge">${escapeHtml(answer.category.replace(/_/g, " ").toUpperCase())}</span>
          <span>${escapeHtml(answer.confidence.toUpperCase())} confidence</span>
          ${sourceQuestion?.required ? "<span>REQUIRED</span>" : ""}
        </div>
        <h2>${index + 1}. ${escapeHtml(answer.question)}</h2>
        ${sourceQuestion?.options.length ? `<div><strong>Available options</strong>${list(sourceQuestion.options)}</div>` : ""}
        ${answerBlock}
        ${answer.talkingPoints.length ? `<div><strong>Talking points</strong>${list(answer.talkingPoints)}</div>` : ""}
        ${answer.evidence.length ? `<div><strong>Evidence used</strong>${list(answer.evidence)}</div>` : ""}
        ${answer.missingInformation.length ? `<div class="warn"><strong>Missing information</strong>${list(answer.missingInformation)}</div>` : ""}
        ${answer.warning ? `<p class="warn"><strong>Warning:</strong> ${escapeHtml(answer.warning)}</p>` : ""}
      </section>
    `;
  }).join("");

  const restriction = analysis.aiRestrictionDetected
    ? `<div class="restriction"><strong>AI CONTENT RESTRICTION DETECTED</strong><p>${escapeHtml(analysis.aiRestrictionEvidence)}</p><p>Use the talking points to write restricted free-text answers in your own words.</p></div>`
    : "";

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(form.company)} — Application Report</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;background:#f5f7fa;color:#18212f;margin:0}
main{max-width:1000px;margin:40px auto;padding:0 20px 60px}
header,.card,.restriction{background:#fff;border:1px solid #dfe5ec;border-radius:12px;padding:22px;margin-bottom:18px}
h1{margin:0 0 8px}.muted{color:#637083}.meta{display:flex;gap:10px;flex-wrap:wrap;color:#637083;font-size:13px}
.badge{font-weight:700;color:#173b63}.answer{background:#eef7ee;border-left:4px solid #4b8b4b;padding:12px 16px;margin:16px 0}
.warn{color:#8a4b00}.restriction{border-left:5px solid #c77800;background:#fff8e8}
a{color:#145ea8}li{margin:5px 0}p{line-height:1.55}
</style>
</head>
<body><main>
<header>
<h1>${escapeHtml(form.company)} — ${escapeHtml(form.title)}</h1>
<p class="muted">${escapeHtml(form.location ?? "Unknown location")} · ${form.questions.length} questions</p>
<p><a href="${escapeHtml(form.sourceUrl)}">Open original application</a></p>
<p><strong>Strategy:</strong> ${escapeHtml(analysis.strategySummary)}</p>
</header>
${restriction}
${cards}
</main></body></html>`;

  await writeFile(path, html, "utf8");
  return path;
}
