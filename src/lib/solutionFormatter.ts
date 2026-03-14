/**
 * Solution Formatter — transforms raw Wolfram Alpha pods + AI interpretation
 * into structured, educational step-by-step explanations.
 *
 * Only touches the presentation layer. No API calls.
 */

export interface FormattedStep {
  title: string;
  explanation: string;
  formula?: string;
  type?: "answer" | "interpretation" | "hypothesis" | "values" | "formula" | "substitution" | "computation" | "conclusion" | "plot" | "info";
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
  /number\s*name/i,
  /number\s*line/i,
  /binary/i,
  /octal/i,
  /hexadecimal/i,
  /base\s*\d+/i,
  /modular\s*residue/i,
  /residue/i,
  /continued\s*fraction/i,
  /egyptian\s*fraction/i,
  /number\s*length/i,
  /multiplicative\s*order/i,
  /divisors/i,
  /prime\s*factorization/i,
  /number\s*representation/i,
  /typical\s*human\s*computation/i,
  /babel\s*representation/i,
  /roman\s*numeral/i,
  /number\s*type/i,
  /\bproperty\b.*number/i,
  /quadratic\s*residue/i,
  /primitive\s*root/i,
];

function shouldHidePod(title: string): boolean {
  return HIDDEN_POD_PATTERNS.some((pat) => pat.test(title));
}

// ── Category detection helpers ───────────────────────────────────
type MathCategory =
  | "algebra"
  | "calculus"
  | "statistics"
  | "probability"
  | "geometry"
  | "trigonometry"
  | "linear_algebra"
  | "differential_equations"
  | "optimization"
  | "arithmetic"
  | "general";

function detectCategory(category?: string, query?: string): MathCategory {
  if (category) {
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
  }
  return "general";
}

// ── Pod classification ───────────────────────────────────────────
interface ClassifiedPod {
  title: string;
  text: string;
  images: string[];
  role: "input" | "result" | "alternate" | "plot" | "step" | "info";
}

function classifyPods(pods: any[]): ClassifiedPod[] {
  const result: ClassifiedPod[] = [];

  for (const pod of pods) {
    if (shouldHidePod(pod.title || "")) continue;

    const texts = pod.subpods
      ?.map((sp: any) => sp.plaintext)
      .filter((t: string) => t && t.trim())
      .join("\n") || "";

    const podImages = pod.subpods
      ?.map((sp: any) => sp.img)
      .filter((img: string | null) => img) || [];

    const title = pod.title || "Result";
    const lower = title.toLowerCase();

    let role: ClassifiedPod["role"] = "info";
    if (lower.includes("input") || lower.includes("interpretation")) role = "input";
    else if (lower.includes("result") || lower.includes("solution") || lower.includes("roots") || lower.includes("value") || lower.includes("answer")) role = "result";
    else if (lower.includes("alternate") || lower.includes("equivalent")) role = "alternate";
    else if (lower.includes("plot") || lower.includes("graph") || lower.includes("visual")) role = "plot";
    else if (lower.includes("step") || lower.includes("possible") || lower.includes("derivative") || lower.includes("integral") || lower.includes("indefinite") || lower.includes("definite")) role = "result";

    result.push({ title, text: texts, images: podImages, role });
  }

  return result;
}

// ── Build educational steps from pods + AI data ──────────────────
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
  const cat = detectCategory(aiData?.category, originalQuery);
  const steps: FormattedStep[] = [];
  const images: string[] = [];
  let answer = "";
  let answerFormula: string | undefined;

  // Collect images from plot pods
  for (const pod of classified) {
    if (pod.images.length) images.push(...pod.images);
  }

  // Extract answer from result pods
  const resultPods = classified.filter((p) => p.role === "result");
  const inputPods = classified.filter((p) => p.role === "input");
  const infoPods = classified.filter((p) => p.role === "info" || p.role === "alternate");

  if (resultPods.length > 0) {
    answer = resultPods[0].text || "(see visualization)";
    // Try to create a formula version for the answer
    answerFormula = tryLatexify(answer);
  }

  // ── Step 1: Problem Interpretation ─────────────────────────────
  const interpretationText =
    aiData?.interpretation ||
    inputPods[0]?.text ||
    `Solving: ${originalQuery || "the given problem"}`;

  steps.push({
    title: getInterpretationTitle(cat),
    explanation: interpretationText,
    type: "interpretation",
  });

  // ── Step 2: Category-specific hypothesis / setup ───────────────
  if (cat === "statistics" && aiData?.extractedValues) {
    const ev = aiData.extractedValues;
    // Hypotheses
    if (ev.population_mean !== undefined) {
      steps.push({
        title: "Step 2 — Define Hypotheses",
        explanation: `$H_0$: $\\mu = ${ev.population_mean}$\\n$H_1$: $\\mu \\neq ${ev.population_mean}$`,
        type: "hypothesis",
      });
    }
  }

  // ── Step 3: Known Values ───────────────────────────────────────
  if (aiData?.extractedValues && Object.keys(aiData.extractedValues).length > 0) {
    const lines = Object.entries(aiData.extractedValues).map(
      ([key, val]) => `${formatVariableName(key)} = ${val}`
    );
    steps.push({
      title: getKnownValuesTitle(cat),
      explanation: lines.join("\n"),
      type: "values",
    });
  }

  // ── Step 4: Formula Used ───────────────────────────────────────
  if (aiData?.formula) {
    steps.push({
      title: getFormulaTitle(cat),
      explanation: "The following formula is applied:",
      formula: aiData.formula,
      type: "formula",
    });
  }

  // ── Step 5+: AI-provided computation steps ─────────────────────
  if (aiData?.steps?.length) {
    for (const s of aiData.steps) {
      steps.push({
        title: s.title,
        explanation: s.detail,
        type: "computation",
      });
    }
  }

  // ── Additional Wolfram result pods (useful ones) ───────────────
  for (const pod of resultPods) {
    // Don't duplicate the answer
    if (pod.text === answer && resultPods.indexOf(pod) === 0) continue;
    if (pod.text) {
      steps.push({
        title: pod.title,
        explanation: pod.text,
        type: "info",
      });
    }
  }

  // Add select info pods that are educationally useful
  for (const pod of infoPods) {
    if (pod.text && isEducationallyUseful(pod.title, pod.text)) {
      steps.push({
        title: pod.title,
        explanation: pod.text,
        type: "info",
      });
    }
  }

  // ── Final Conclusion step ──────────────────────────────────────
  if (answer) {
    steps.push({
      title: getConclusionTitle(cat),
      explanation: buildConclusion(cat, answer, aiData),
      type: "conclusion",
    });
  }

  // Fallback if no answer found
  if (!answer && steps.length > 0) {
    const lastStep = steps[steps.length - 1];
    answer = lastStep.explanation;
  }
  if (!answer) answer = "No result could be determined.";

  return {
    steps,
    answer,
    answerFormula,
    images,
    category: aiData?.category || cat,
    interpretation: aiData?.interpretation,
    formula: aiData?.formula,
  };
}

// ── Helpers ──────────────────────────────────────────────────────

function getInterpretationTitle(cat: MathCategory): string {
  const map: Partial<Record<MathCategory, string>> = {
    statistics: "Step 1 — Problem Interpretation",
    calculus: "Step 1 — Problem Interpretation",
    algebra: "Step 1 — Problem Interpretation",
    geometry: "Step 1 — Problem Interpretation",
  };
  return map[cat] || "Step 1 — Problem Interpretation";
}

function getKnownValuesTitle(cat: MathCategory): string {
  if (cat === "statistics") return "Step 3 — Identify Known Values";
  return "Known Values";
}

function getFormulaTitle(cat: MathCategory): string {
  if (cat === "calculus") return "Rule / Formula Applied";
  if (cat === "statistics") return "Step 4 — Formula Used";
  return "Formula Used";
}

function getConclusionTitle(cat: MathCategory): string {
  if (cat === "statistics") return "Interpretation & Conclusion";
  if (cat === "calculus") return "Final Interpretation";
  return "Conclusion";
}

function buildConclusion(cat: MathCategory, answer: string, aiData?: any): string {
  if (cat === "statistics") {
    return `The computed test statistic is ${answer}. Compare this against critical values at your chosen significance level to determine whether to reject or fail to reject the null hypothesis.`;
  }
  if (cat === "calculus") {
    return `The result of the computation is: ${answer}`;
  }
  return `The solution to the problem is: ${answer}`;
}

function formatVariableName(key: string): string {
  const map: Record<string, string> = {
    sample_mean: "Sample mean (x̄)",
    population_mean: "Population mean (μ)",
    standard_deviation: "Standard deviation (σ)",
    sample_size: "Sample size (n)",
    significance_level: "Significance level (α)",
    degrees_of_freedom: "Degrees of freedom (df)",
    variance: "Variance (σ²)",
    probability: "Probability (p)",
  };
  return map[key] || key.replace(/_/g, " ");
}

function isEducationallyUseful(title: string, text: string): boolean {
  const lower = title.toLowerCase();
  // Keep these
  if (lower.includes("approximate") && lower.includes("form")) return true;
  if (lower.includes("series")) return true;
  if (lower.includes("limit")) return true;
  if (lower.includes("convergence")) return true;
  if (lower.includes("domain")) return true;
  if (lower.includes("range")) return true;
  if (lower.includes("geometric")) return true;
  // Hide very short or trivially unhelpful
  if (text.length < 5) return false;
  return false; // default: hide non-essential info pods
}

function tryLatexify(text: string): string | undefined {
  if (!text) return undefined;
  // If it looks like it already has LaTeX-like content
  if (text.includes("\\frac") || text.includes("\\sqrt")) return text;
  // Simple patterns: x = value
  const simpleMatch = text.match(/^([a-zA-Z_]+)\s*=\s*(.+)$/);
  if (simpleMatch) return `${simpleMatch[1]} = ${simpleMatch[2]}`;
  return undefined;
}
