import ExcelJS from "exceljs";

import type {
  AnalyzedJob,
} from "./json-writer.js";

export type FailedAnalysis = {
  company: string;
  title: string;
  location: string;
  applyUrl: string;
  preliminaryTechScore: number;
  error: string;
};

function actionFor(
  item: AnalyzedJob
): "APPLY" | "REVIEW" | "SKIP" {
  const analysis = item.analysis;

  if (
    analysis.eligibility?.status === "ineligible" ||
    analysis.recommendation === "weak_match"
  ) {
    return "SKIP";
  }

  if (
    analysis.blockers.length > 0 ||
    analysis.recommendation === "possible_match"
  ) {
    return "REVIEW";
  }

  return "APPLY";
}

function joinValues(
  values: string[] | undefined
): string {
  return values?.join("; ") ?? "";
}

function recommendationLabel(
  value: string
): string {
  return value
    .replace(/_/g, " ")
    .toUpperCase();
}

export async function saveAnalyzedJobsToExcel(
  csvOutputPath: string,
  analyzedJobs: AnalyzedJob[],
  failedAnalyses: FailedAnalysis[] = []
): Promise<string> {
  const outputPath =
    csvOutputPath.replace(/\.csv$/i, ".xlsx");

  const workbook =
    new ExcelJS.Workbook();

  workbook.creator = "Job Hunter";
  workbook.created = new Date();

  const summary =
    workbook.addWorksheet("Summary", {
      views: [{ showGridLines: false }],
    });

  const total = analyzedJobs.length;
  const strong = analyzedJobs.filter(
    (item) =>
      item.analysis.recommendation ===
      "strong_match"
  ).length;
  const good = analyzedJobs.filter(
    (item) =>
      item.analysis.recommendation ===
      "good_match"
  ).length;
  const possible = analyzedJobs.filter(
    (item) =>
      item.analysis.recommendation ===
      "possible_match"
  ).length;
  const weak = analyzedJobs.filter(
    (item) =>
      item.analysis.recommendation ===
      "weak_match"
  ).length;
  const ineligible = analyzedJobs.filter(
    (item) =>
      item.analysis.eligibility?.status ===
      "ineligible"
  ).length;
  const applyCount = analyzedJobs.filter(
    (item) => actionFor(item) === "APPLY"
  ).length;
  const reviewCount = analyzedJobs.filter(
    (item) => actionFor(item) === "REVIEW"
  ).length;
  const skipCount = analyzedJobs.filter(
    (item) => actionFor(item) === "SKIP"
  ).length;
  const averageScore =
    total === 0
      ? 0
      : Math.round(
          analyzedJobs.reduce(
            (sum, item) =>
              sum + item.analysis.overallScore,
            0
          ) / total
        );

  summary.mergeCells("A1:D1");
  summary.getCell("A1").value =
    "JOB HUNTER — ANALYSIS SUMMARY";
  summary.getCell("A1").font = {
    bold: true,
    size: 18,
    color: { argb: "FFFFFFFF" },
  };
  summary.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F4E78" },
  };
  summary.getCell("A1").alignment = {
    vertical: "middle",
  };
  summary.getRow(1).height = 32;

  const metrics: Array<
    [string, number | string, string]
  > = [
    ["Analyzed", total, "FFD9EAF7"],
    ["Average score", `${averageScore}%`, "FFD9EAF7"],
    ["Strong matches", strong, "FFC6EFCE"],
    ["Good matches", good, "FFE2F0D9"],
    ["Possible matches", possible, "FFFFEB9C"],
    ["Weak matches", weak, "FFFFC7CE"],
    ["Ineligible", ineligible, "FFFFC7CE"],
    ["Apply", applyCount, "FFC6EFCE"],
    ["Review", reviewCount, "FFFFEB9C"],
    ["Skip", skipCount, "FFFFC7CE"],
    ["Failed analysis", failedAnalyses.length, "FFFFC7CE"],
  ];

  metrics.forEach(
    ([label, value, color], index) => {
      const row = index + 3;
      summary.getCell(row, 1).value = label;
      summary.getCell(row, 2).value = value;
      summary.getCell(row, 1).font = {
        bold: true,
      };
      summary.getCell(row, 2).font = {
        bold: true,
      };
      summary.getCell(row, 1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: color },
      };
      summary.getCell(row, 2).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: color },
      };
    }
  );

  summary.getColumn(1).width = 24;
  summary.getColumn(2).width = 16;

  const jobs =
    workbook.addWorksheet("Jobs", {
      views: [
        {
          state: "frozen",
          ySplit: 1,
        },
      ],
    });

  jobs.columns = [
    { header: "Action", key: "action", width: 12 },
    { header: "Score", key: "score", width: 10 },
    { header: "Match", key: "recommendation", width: 18 },
    { header: "Company", key: "company", width: 20 },
    { header: "Position", key: "title", width: 42 },
    { header: "Location", key: "location", width: 24 },
    { header: "Eligibility", key: "eligibility", width: 14 },
    { header: "Missing required", key: "missingRequired", width: 36 },
    { header: "Blockers", key: "blockers", width: 36 },
    { header: "Why", key: "reasoning", width: 60 },
    { header: "Apply URL", key: "applyUrl", width: 55 },
    { header: "Matched skills", key: "matchedSkills", width: 45 },
    { header: "Skills score", key: "skillsScore", width: 12 },
    { header: "Work arrangement", key: "workArrangement", width: 18 },
    { header: "Seniority", key: "seniority", width: 14 },
    { header: "Required years", key: "requiredYears", width: 14 },
    { header: "Pre-score", key: "preScore", width: 12 },
    { header: "Source", key: "source", width: 16 },
    { header: "Analyzed at", key: "analyzedAt", width: 22 },
  ];

  const header = jobs.getRow(1);
  header.font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
  };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F4E78" },
  };
  header.alignment = {
    vertical: "middle",
    horizontal: "center",
  };
  header.height = 28;

  const sorted = [...analyzedJobs].sort(
    (a, b) =>
      b.analysis.overallScore -
      a.analysis.overallScore
  );

  for (const item of sorted) {
    const analysis = item.analysis;

    const action = actionFor(item);

    const row = jobs.addRow({
      action,
      score: analysis.overallScore / 100,
      recommendation:
        recommendationLabel(
          analysis.recommendation
        ),
      company: item.job.company,
      title: item.job.title,
      location:
        item.job.location ?? "Unknown",
      eligibility:
        analysis.eligibility?.status ??
        "uncertain",
      missingRequired:
        joinValues(
          analysis.skills.missingRequired
        ),
      blockers:
        joinValues(analysis.blockers),
      reasoning: analysis.reasoning,
      applyUrl: {
        text: item.job.applyUrl,
        hyperlink: item.job.applyUrl,
      },
      matchedSkills:
        joinValues(analysis.skills.matched),
      skillsScore:
        analysis.skills.score / 100,
      workArrangement:
        analysis.workArrangement.type,
      seniority:
        analysis.seniority.required,
      requiredYears:
        analysis.experience.requiredYears ??
        "",
      preScore:
        item.preliminaryTechScore === undefined
          ? ""
          : item.preliminaryTechScore / 100,
      source: item.job.source,
      analyzedAt: item.analyzedAt,
    });

    row.getCell("score").numFmt = "0%";
    row.getCell("skillsScore").numFmt = "0%";

    if (
      typeof row.getCell("preScore").value ===
      "number"
    ) {
      row.getCell("preScore").numFmt = "0%";
    }

    const isIneligible =
      analysis.eligibility?.status ===
      "ineligible";

    const fillColor =
      isIneligible
        ? "FFFFC7CE"
        : analysis.recommendation ===
            "strong_match"
          ? "FFC6EFCE"
          : analysis.recommendation ===
              "good_match"
            ? "FFE2F0D9"
            : analysis.recommendation ===
                "possible_match"
              ? "FFFFEB9C"
              : "FFFFC7CE";

    row.eachCell((cell) => {
      cell.alignment = {
        vertical: "top",
        wrapText: true,
      };
    });

    for (let column = 1; column <= 7; column++) {
      row.getCell(column).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: fillColor },
      };
    }

    row.height = 54;
  }

  jobs.autoFilter = {
    from: "A1",
    to: "S1",
  };

  jobs.getColumn("action").font = { bold: true };

  jobs.getColumn("score").alignment = {
    horizontal: "center",
  };

  if (failedAnalyses.length > 0) {
    const failed = workbook.addWorksheet("Failed");

    failed.columns = [
      { header: "Company", key: "company", width: 20 },
      { header: "Position", key: "title", width: 44 },
      { header: "Location", key: "location", width: 24 },
      { header: "Pre-score", key: "score", width: 12 },
      { header: "Error", key: "error", width: 70 },
      { header: "Apply URL", key: "applyUrl", width: 55 },
    ];

    const failedHeader = failed.getRow(1);
    failedHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
    failedHeader.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F4E78" },
    };

    for (const item of failedAnalyses) {
      const row = failed.addRow({
        company: item.company,
        title: item.title,
        location: item.location,
        score: item.preliminaryTechScore / 100,
        error: item.error,
        applyUrl: { text: item.applyUrl, hyperlink: item.applyUrl },
      });
      row.getCell("score").numFmt = "0%";
      row.eachCell((cell) => {
        cell.alignment = { vertical: "top", wrapText: true };
      });
    }

    failed.autoFilter = { from: "A1", to: "F1" };
    failed.views = [{ state: "frozen", ySplit: 1 }];
  }

  await workbook.xlsx.writeFile(
    outputPath
  );

  return outputPath;
}
