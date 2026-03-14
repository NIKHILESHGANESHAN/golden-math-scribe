/**
 * Solution Formatter — transforms raw Wolfram Alpha pods + AI interpretation
 * into structured, human-style worked solutions like a tutor would write.
 *
 * Only touches the presentation layer. No API calls.
 */

export interface FormattedStep {
  title: string;
  content: ContentBlock[];
  type: "answer" | "interpretation" | "hypothesis" | "values" | "formula" | "substitution" | "computation" | "conclusion" | "plot" | "info" | "pvalue";
}

export interface ContentBlock {
  kind: "text" | "latex" | "latex-block" | "highlight";
  value: string;
}

export interface FormattedSolution {
  steps: FormattedStep[];
  answer: string;
  answerFormula?: string;
  images: string[];
  category?: string;
  interpretation?: string;
  formula?: string;
}

// ── Irrelevant pod titles to hide ────────────────────────────────
const HIDDEN_POD_PATTERNS = [
  /number\s*name/i, /number\s*line/i, /binary/i, /octal/i,
  /hexadecimal/i, /base\s*\d+/i, /modular\s*residue/i, /residue/i,
  /continued\s*fraction/i, /egyptian\s*fraction/i, /number\s*length/i,
  /multiplicative\s*order/i, /divisors/i, /prime\s*factorization/i,
  /number\s*representation/i, /typical\s*human\s*computation/i,
  /babel\s*representation/i, /roman\s*numeral/i, /number\s*type/i,
  /\bproperty\b.*number/i, /quadratic\s*residue/i, /primitive\s*root/i,
];

function shouldHidePod(title: string): boolean {
  return HIDDEN_POD_PATTERNS.some((pat) => pat.test(title));
}

// ── Helpers ──────────────────────────────────────────────────────

function txt(value: string): ContentBlock { return { kind: "text", value }; }
function tex(value: string): ContentBlock { return { kind: "latex", value }; }
function texBlock(value: string): ContentBlock { return { kind: "latex-block", value }; }
function highlight(value: string): ContentBlock { return { kind: "highlight", value }; }

type MathCategory =
  | "algebra" | "calculus" | "statistics" | "probability"
  | "geometry" | "trigonometry" | "linear_algebra"
  | "differential_equations" | "optimization" | "arithmetic" | "general";

function detectCategory(category?: string): MathCategory {
  if (!category) return "general";
  const c = category.toLowerCase();
  if (c.includes("statistic") || c.includes("hypothesis") || c.includes("z-test") || c.includes("t-test")) return "statistics";
  if (c.includes("calculus") || c.includes("derivative") || c.includes("integral") || c.includes("differentiation")) return "calculus";
  if (c.includes("algebra")) return "algebra";
  if (c.includes("probability")) return "probability";
  if (c.includes("geometry")) return "geometry";
  if (c.includes("trigonometry") || c.includes("trig")) return "trigonometry";
  if (c.includes("linear") || c.includes("matrix") || c.includes("eigen")) return "linear_algebra";
  if (c.includes("differential") && c.includes("equation")) return "differential_equations";
  if (c.includes("optimization")) return "optimization";
  if (c.includes("arithmetic")) return "arithmetic";
  return "general";
}

interface ClassifiedPod {
  title: string; text: string; images: string[];
  role: "input" | "result" | "alternate" | "plot" | "step" | "info";
}

function classifyPods(pods: any[]): ClassifiedPod[] {
  const result: ClassifiedPod[] = [];
  for (const pod of pods) {
    if (shouldHidePod(pod.title || "")) continue;
    const texts = pod.subpods?.map((sp: any) => sp.plaintext).filter((t: string) => t?.trim()).join("\n") || "";
    const podImages = pod.subpods?.map((sp: any) => sp.img).filter((img: string | null) => img) || [];
    const title = pod.title || "Result";
    const lower = title.toLowerCase();
    let role: ClassifiedPod["role"] = "info";
    if (lower.includes("input") || lower.includes("interpretation")) role = "input";
    else if (lower.includes("result") || lower.includes("solution") || lower.includes("roots") || lower.includes("value") || lower.includes("answer")) role = "result";
    else if (lower.includes("alternate") || lower.includes("equivalent")) role = "alternate";
    else if (lower.includes("plot") || lower.includes("graph") || lower.includes("visual")) role = "plot";
    else if (lower.includes("step") || lower.includes("derivative") || lower.includes("integral") || lower.includes("indefinite") || lower.includes("definite")) role = "result";
    result.push({ title, text: texts, images: podImages, role });
  }
  return result;
}

const VAR_LABELS: Record<string, string> = {
  sample_mean: "\\bar{x}", population_mean: "\\mu",
  standard_deviation: "\\sigma", sample_size: "n",
  significance_level: "\\alpha", degrees_of_freedom: "df",
  variance: "\\sigma^2", probability: "p",
};

const VAR_NAMES: Record<string, string> = {
  sample_mean: "Sample mean", population_mean: "Population mean",
  standard_deviation: "Standard deviation", sample_size: "Sample size",
  significance_level: "Significance level", degrees_of_freedom: "Degrees of freedom",
  variance: "Variance", probability: "Probability",
};

function tryLatexify(text: string): string | undefined {
  if (!text) return undefined;
  if (text.includes("\\frac") || text.includes("\\sqrt")) return text;
  const simpleMatch = text.match(/^([a-zA-Z_]+)\s*=\s*(.+)$/);
  if (simpleMatch) return `${simpleMatch[1]} = ${simpleMatch[2]}`;
  return undefined;
}

// ── Category-specific step builders ──────────────────────────────

function buildStatisticsSteps(
  steps: FormattedStep[],
  aiData: NonNullable<Parameters<typeof formatSolution>[1]>,
  answer: string
) {
  const ev = aiData.extractedValues || {};

  // Hypotheses
  if (ev.population_mean !== undefined) {
    steps.push({
      title: "Step 2 — Define Hypotheses",
      type: "hypothesis",
      content: [
        txt("We set up the null and alternative hypotheses:"),
        texBlock(`H_0: \\mu = ${ev.population_mean}`),
        texBlock(`H_1: \\mu \\neq ${ev.population_mean}`),
        txt("The null hypothesis states that the sample comes from the specified population. The alternative hypothesis states it does not."),
      ],
    });
  }

  // Known values
  if (Object.keys(ev).length > 0) {
    const content: ContentBlock[] = [txt("From the problem statement we identify:")];
    for (const [key, val] of Object.entries(ev)) {
      const sym = VAR_LABELS[key] || key;
      const name = VAR_NAMES[key] || key.replace(/_/g, " ");
      content.push(texBlock(`${name}\\;(${sym}) = ${val}`));
    }
    steps.push({ title: "Step 3 — Identify Known Values", type: "values", content });
  }

  // Formula
  if (aiData.formula) {
    steps.push({
      title: "Step 4 — Formula Used",
      type: "formula",
      content: [
        txt("We apply the Z-test formula for comparing a sample mean to a known population mean:"),
        texBlock(aiData.formula),
        txt("The standard error measures how much the sample mean is expected to vary from the population mean."),
      ],
    });
  }

  // Compute standard error
  if (ev.standard_deviation !== undefined && ev.sample_size !== undefined) {
    const sd = Number(ev.standard_deviation);
    const n = Number(ev.sample_size);
    const sqrtN = Math.sqrt(n);
    const se = sd / sqrtN;

    steps.push({
      title: "Step 5 — Calculate Standard Error",
      type: "computation",
      content: [
        txt("The standard error (SE) quantifies the expected variation of the sample mean:"),
        texBlock(`SE = \\frac{\\sigma}{\\sqrt{n}}`),
        txt("Substitute values:"),
        texBlock(`SE = \\frac{${sd}}{\\sqrt{${n}}}`),
        txt("Simplify:"),
        texBlock(`SE = \\frac{${sd}}{${sqrtN}}`),
        highlight(`SE = ${se}`),
      ],
    });

    // Compute Z-score
    if (ev.sample_mean !== undefined && ev.population_mean !== undefined) {
      const xbar = Number(ev.sample_mean);
      const mu = Number(ev.population_mean);
      const z = (xbar - mu) / se;

      steps.push({
        title: "Step 6 — Compute Z-Score",
        type: "computation",
        content: [
          txt("The Z-score tells us how many standard errors the sample mean is from the hypothesized population mean:"),
          texBlock(`Z = \\frac{\\bar{x} - \\mu}{SE}`),
          txt("Substitute values:"),
          texBlock(`Z = \\frac{${xbar} - ${mu}}{${se}}`),
          texBlock(`Z = \\frac{${xbar - mu}}{${se}}`),
          highlight(`Z = ${z}`),
        ],
      });

      // Statistical interpretation
      const absZ = Math.abs(z);
      const alpha = Number(ev.significance_level) || 0.05;
      const criticalZ = alpha === 0.01 ? 2.576 : alpha === 0.1 ? 1.645 : 1.96;
      const reject = absZ > criticalZ;

      steps.push({
        title: "Step 7 — Statistical Interpretation",
        type: "interpretation",
        content: [
          txt(`For a significance level $\\alpha = ${alpha}$, the critical Z-values are:`),
          texBlock(`Z_{critical} = \\pm ${criticalZ}`),
          txt("Compare the test statistic:"),
          texBlock(`|Z| = ${absZ} ${reject ? ">" : "\\leq"} ${criticalZ}`),
          highlight(reject
            ? `Since |Z| = ${absZ} > ${criticalZ}, we reject the null hypothesis.`
            : `Since |Z| = ${absZ} ≤ ${criticalZ}, we fail to reject the null hypothesis.`),
        ],
      });

      // p-value approximation
      // Using a rough approximation for standard normal
      const pValue = absZ > 4 ? "< 0.0001" : (2 * (1 - approxNormalCDF(absZ))).toFixed(6);
      steps.push({
        title: "Step 8 — p-Value",
        type: "pvalue",
        content: [
          txt("The p-value represents the probability of observing a result at least as extreme as the test statistic:"),
          texBlock(`p\\text{-value} \\approx ${pValue}`),
          txt(reject
            ? `This p-value is far below the significance level of ${alpha}, indicating the result is statistically significant.`
            : `This p-value is above the significance level of ${alpha}, indicating the result is not statistically significant.`),
        ],
      });

      // Conclusion
      steps.push({
        title: "Final Conclusion",
        type: "conclusion",
        content: [
          txt(reject
            ? `Based on the Z-test, the sample with mean ${xbar} is statistically significantly different from the hypothesized population mean of ${mu}. It is highly unlikely that this sample comes from the specified population.`
            : `Based on the Z-test, there is insufficient evidence to conclude that the sample mean of ${xbar} is significantly different from the population mean of ${mu}.`),
        ],
      });

      return; // Full statistics pipeline done
    }
  }
}

function buildCalculusSteps(
  steps: FormattedStep[],
  aiData: NonNullable<Parameters<typeof formatSolution>[1]>,
  answer: string,
  resultPods: ClassifiedPod[]
) {
  // Formula / rule
  if (aiData.formula) {
    steps.push({
      title: "Step 2 — Rule Applied",
      type: "formula",
      content: [
        txt("We apply the following differentiation/integration rule:"),
        texBlock(aiData.formula),
      ],
    });
  }

  // AI computation steps (with real math)
  if (aiData.steps?.length) {
    aiData.steps.forEach((s, i) => {
      steps.push({
        title: `Step ${i + 3} — ${s.title}`,
        type: "computation",
        content: [txt(s.detail)],
      });
    });
  }

  // Show Wolfram result pods as worked steps
  for (const pod of resultPods) {
    if (pod.text) {
      steps.push({
        title: pod.title,
        type: "computation",
        content: [texBlock(tryLatexify(pod.text) || pod.text)],
      });
    }
  }

  steps.push({
    title: "Final Result",
    type: "conclusion",
    content: [txt("Therefore, the result is:"), highlight(answer)],
  });
}

function buildAlgebraSteps(
  steps: FormattedStep[],
  aiData: NonNullable<Parameters<typeof formatSolution>[1]>,
  answer: string,
  resultPods: ClassifiedPod[]
) {
  if (aiData.formula) {
    steps.push({
      title: "Step 2 — Equation Setup",
      type: "formula",
      content: [
        txt("We begin with the equation:"),
        texBlock(aiData.formula),
      ],
    });
  }

  if (aiData.steps?.length) {
    aiData.steps.forEach((s, i) => {
      steps.push({
        title: `Step ${i + 3} — ${s.title}`,
        type: "computation",
        content: [txt(s.detail)],
      });
    });
  }

  // Additional result pods (alternate forms, roots, etc.)
  for (const pod of resultPods.slice(0, 3)) {
    if (pod.text) {
      steps.push({
        title: pod.title,
        type: "info",
        content: [texBlock(tryLatexify(pod.text) || pod.text)],
      });
    }
  }

  steps.push({
    title: "Final Result",
    type: "conclusion",
    content: [txt("The solution is:"), highlight(answer)],
  });
}

function buildGenericSteps(
  steps: FormattedStep[],
  aiData: NonNullable<Parameters<typeof formatSolution>[1]> | undefined,
  answer: string,
  resultPods: ClassifiedPod[]
) {
  if (aiData?.extractedValues && Object.keys(aiData.extractedValues).length > 0) {
    const content: ContentBlock[] = [txt("Identified values:")];
    for (const [key, val] of Object.entries(aiData.extractedValues)) {
      content.push(texBlock(`${key.replace(/_/g, "\\;")} = ${val}`));
    }
    steps.push({ title: "Step 2 — Known Values", type: "values", content });
  }

  if (aiData?.formula) {
    steps.push({
      title: "Step 3 — Formula",
      type: "formula",
      content: [txt("Applying:"), texBlock(aiData.formula)],
    });
  }

  if (aiData?.steps?.length) {
    aiData.steps.forEach((s, i) => {
      steps.push({
        title: s.title,
        type: "computation",
        content: [txt(s.detail)],
      });
    });
  }

  for (const pod of resultPods.slice(0, 3)) {
    if (pod.text) {
      steps.push({
        title: pod.title,
        type: "info",
        content: [texBlock(tryLatexify(pod.text) || pod.text)],
      });
    }
  }

  steps.push({
    title: "Conclusion",
    type: "conclusion",
    content: [txt("The result is:"), highlight(answer)],
  });
}

// ── Main formatter ───────────────────────────────────────────────

export function formatSolution(
  pods: any[],
  aiData?: {
    category?: string;
    interpretation?: string;
    formula?: string;
    steps?: { title: string; detail: string }[];
    extractedValues?: Record<string, any>;
  },
  originalQuery?: string
): FormattedSolution {
  const classified = classifyPods(pods);
  const cat = detectCategory(aiData?.category);
  const steps: FormattedStep[] = [];
  const images: string[] = [];
  let answer = "";
  let answerFormula: string | undefined;

  for (const pod of classified) {
    if (pod.images.length) images.push(...pod.images);
  }

  const resultPods = classified.filter((p) => p.role === "result");
  const inputPods = classified.filter((p) => p.role === "input");

  if (resultPods.length > 0) {
    answer = resultPods[0].text || "(see visualization)";
    answerFormula = tryLatexify(answer);
  }

  // Step 1: Interpretation (always present)
  const interpretationText = aiData?.interpretation || inputPods[0]?.text || `Solving: ${originalQuery || "the given problem"}`;
  steps.push({
    title: "Step 1 — Problem Interpretation",
    type: "interpretation",
    content: [txt(interpretationText)],
  });

  // Category-specific worked solution
  switch (cat) {
    case "statistics":
      if (aiData) buildStatisticsSteps(steps, aiData, answer);
      else buildGenericSteps(steps, aiData, answer, resultPods);
      break;
    case "calculus":
      if (aiData) buildCalculusSteps(steps, aiData, answer, resultPods);
      else buildGenericSteps(steps, aiData, answer, resultPods);
      break;
    case "algebra":
      if (aiData) buildAlgebraSteps(steps, aiData, answer, resultPods);
      else buildGenericSteps(steps, aiData, answer, resultPods);
      break;
    default:
      buildGenericSteps(steps, aiData, answer, resultPods);
      break;
  }

  if (!answer && steps.length > 0) {
    const lastContent = steps[steps.length - 1].content;
    answer = lastContent[lastContent.length - 1]?.value || "No result could be determined.";
  }
  if (!answer) answer = "No result could be determined.";

  return { steps, answer, answerFormula, images, category: aiData?.category || cat, interpretation: aiData?.interpretation, formula: aiData?.formula };
}

// ── Approximate standard normal CDF (for p-value) ───────────────
function approxNormalCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}
