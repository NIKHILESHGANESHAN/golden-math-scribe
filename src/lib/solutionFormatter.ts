/**
 * Solution Formatter — transforms raw Wolfram Alpha pods + AI interpretation
 * into structured, human-style worked solutions like a tutor would write.
 *
 * Implements rule-based step decomposition with category-specific templates
 * and progressive mathematical simplification.
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
  sample_mean_1: "\\bar{x}_1", sample_mean_2: "\\bar{x}_2",
  population_mean_1: "\\mu_1", population_mean_2: "\\mu_2",
  sample_size_1: "n_1", sample_size_2: "n_2",
  successes_1: "x_1", successes_2: "x_2",
  proportion_1: "\\hat{p}_1", proportion_2: "\\hat{p}_2",
  pooled_proportion: "\\hat{p}",
  standard_error: "SE",
  confidence_level: "1 - \\alpha",
};

const VAR_NAMES: Record<string, string> = {
  sample_mean: "Sample mean", population_mean: "Population mean",
  standard_deviation: "Standard deviation", sample_size: "Sample size",
  significance_level: "Significance level", degrees_of_freedom: "Degrees of freedom",
  variance: "Variance", probability: "Probability",
  sample_mean_1: "Sample mean (group 1)", sample_mean_2: "Sample mean (group 2)",
  population_mean_1: "Population mean (group 1)", population_mean_2: "Population mean (group 2)",
  sample_size_1: "Sample size (group 1)", sample_size_2: "Sample size (group 2)",
  successes_1: "Successes (group 1)", successes_2: "Successes (group 2)",
  proportion_1: "Proportion (group 1)", proportion_2: "Proportion (group 2)",
  pooled_proportion: "Pooled proportion",
  standard_error: "Standard error",
  confidence_level: "Confidence level",
};

function tryLatexify(text: string): string | undefined {
  if (!text) return undefined;
  if (text.includes("\\frac") || text.includes("\\sqrt")) return text;
  const simpleMatch = text.match(/^([a-zA-Z_]+)\s*=\s*(.+)$/);
  if (simpleMatch) return `${simpleMatch[1]} = ${simpleMatch[2]}`;
  return undefined;
}

// ── Detect sub-type for statistics ───────────────────────────────
type StatsSubType = "one_sample_z" | "two_proportion_z" | "one_sample_t" | "confidence_interval" | "generic_stats";

function detectStatsSubType(ev: Record<string, any>, query?: string): StatsSubType {
  const q = (query || "").toLowerCase();
  // Two-proportion Z-test
  if ((ev.successes_1 !== undefined && ev.successes_2 !== undefined) ||
      (ev.proportion_1 !== undefined && ev.proportion_2 !== undefined) ||
      (ev.sample_size_1 !== undefined && ev.sample_size_2 !== undefined) ||
      q.includes("two proportion") || q.includes("2 proportion") ||
      (q.includes("out of") && q.split("out of").length > 2)) {
    return "two_proportion_z";
  }
  if (q.includes("t-test") || q.includes("t test")) return "one_sample_t";
  if (q.includes("confidence interval")) return "confidence_interval";
  return "one_sample_z";
}

// ── Category-specific step builders ──────────────────────────────

function buildStatisticsSteps(
  steps: FormattedStep[],
  aiData: NonNullable<Parameters<typeof formatSolution>[1]>,
  answer: string,
  originalQuery?: string
) {
  const ev = aiData.extractedValues || {};
  const subType = detectStatsSubType(ev, originalQuery);

  if (subType === "two_proportion_z") {
    buildTwoProportionZSteps(steps, ev, answer);
  } else {
    buildOneSampleZSteps(steps, aiData, ev, answer);
  }
}

function buildTwoProportionZSteps(
  steps: FormattedStep[],
  ev: Record<string, any>,
  answer: string
) {
  // Extract values
  const x1 = Number(ev.successes_1 || ev.x1 || 0);
  const n1 = Number(ev.sample_size_1 || ev.n1 || 0);
  const x2 = Number(ev.successes_2 || ev.x2 || 0);
  const n2 = Number(ev.sample_size_2 || ev.n2 || 0);

  // Step: Hypotheses
  steps.push({
    title: "Step 2 — Define Hypotheses",
    type: "hypothesis",
    content: [
      txt("We set up the null and alternative hypotheses for comparing two population proportions:"),
      texBlock("H_0: p_1 = p_2"),
      texBlock("H_1: p_1 \\neq p_2"),
      txt("The null hypothesis assumes both populations have the same proportion. The alternative hypothesis states they differ."),
    ],
  });

  // Step: Known values
  const valContent: ContentBlock[] = [txt("From the problem statement we extract:")];
  if (x1) valContent.push(texBlock(`x_1 = ${x1} \\quad (\\text{successes in group 1})`));
  if (n1) valContent.push(texBlock(`n_1 = ${n1} \\quad (\\text{sample size of group 1})`));
  if (x2) valContent.push(texBlock(`x_2 = ${x2} \\quad (\\text{successes in group 2})`));
  if (n2) valContent.push(texBlock(`n_2 = ${n2} \\quad (\\text{sample size of group 2})`));
  steps.push({ title: "Step 3 — Identify Known Values", type: "values", content: valContent });

  // Step: Sample proportions
  if (n1 > 0 && n2 > 0) {
    const p1 = x1 / n1;
    const p2 = x2 / n2;

    steps.push({
      title: "Step 4 — Compute Sample Proportions",
      type: "computation",
      content: [
        txt("The sample proportion is calculated by dividing the number of successes by the total sample size:"),
        texBlock("\\hat{p}_1 = \\frac{x_1}{n_1}"),
        txt("Substitute values:"),
        texBlock(`\\hat{p}_1 = \\frac{${x1}}{${n1}}`),
        highlight(`$\\hat{p}_1 = ${p1.toFixed(4)}$`),
        texBlock("\\hat{p}_2 = \\frac{x_2}{n_2}"),
        txt("Substitute values:"),
        texBlock(`\\hat{p}_2 = \\frac{${x2}}{${n2}}`),
        highlight(`$\\hat{p}_2 = ${p2.toFixed(4)}$`),
      ],
    });

    // Step: Pooled proportion
    const pHat = (x1 + x2) / (n1 + n2);

    steps.push({
      title: "Step 5 — Compute Pooled Proportion",
      type: "computation",
      content: [
        txt("Under the null hypothesis, we combine both samples to estimate the common proportion:"),
        texBlock("\\hat{p} = \\frac{x_1 + x_2}{n_1 + n_2}"),
        txt("Substitute values:"),
        texBlock(`\\hat{p} = \\frac{${x1} + ${x2}}{${n1} + ${n2}}`),
        texBlock(`\\hat{p} = \\frac{${x1 + x2}}{${n1 + n2}}`),
        highlight(`$\\hat{p} = ${pHat.toFixed(4)}$`),
        txt("The pooled proportion combines both samples under the assumption that the null hypothesis is true."),
      ],
    });

    // Step: Standard error
    const seSquared = pHat * (1 - pHat) * (1 / n1 + 1 / n2);
    const se = Math.sqrt(seSquared);

    steps.push({
      title: "Step 6 — Compute Standard Error",
      type: "computation",
      content: [
        txt("The standard error for the difference of two proportions is:"),
        texBlock("SE = \\sqrt{\\hat{p}(1 - \\hat{p})\\left(\\frac{1}{n_1} + \\frac{1}{n_2}\\right)}"),
        txt("Substitute values:"),
        texBlock(`SE = \\sqrt{${pHat.toFixed(4)} \\times ${(1 - pHat).toFixed(4)} \\times \\left(\\frac{1}{${n1}} + \\frac{1}{${n2}}\\right)}`),
        texBlock(`SE = \\sqrt{${pHat.toFixed(4)} \\times ${(1 - pHat).toFixed(4)} \\times ${(1 / n1 + 1 / n2).toFixed(6)}}`),
        texBlock(`SE = \\sqrt{${seSquared.toFixed(6)}}`),
        highlight(`$SE = ${se.toFixed(4)}$`),
        txt("The standard error quantifies the expected sampling variability in the difference between proportions."),
      ],
    });

    // Step: Z-statistic
    const z = (p1 - p2) / se;

    steps.push({
      title: "Step 7 — Compute Test Statistic",
      type: "computation",
      content: [
        txt("The Z-statistic measures how many standard errors the observed difference is away from zero:"),
        texBlock("Z = \\frac{\\hat{p}_1 - \\hat{p}_2}{SE}"),
        txt("Substitute values:"),
        texBlock(`Z = \\frac{${p1.toFixed(4)} - ${p2.toFixed(4)}}{${se.toFixed(4)}}`),
        texBlock(`Z = \\frac{${(p1 - p2).toFixed(4)}}{${se.toFixed(4)}}`),
        highlight(`$Z = ${z.toFixed(4)}$`),
      ],
    });

    // Step: Critical value & decision
    const alpha = 0.05;
    const criticalZ = 1.96;
    const absZ = Math.abs(z);
    const reject = absZ > criticalZ;

    steps.push({
      title: "Step 8 — Determine Critical Value and Decision",
      type: "interpretation",
      content: [
        txt(`For a two-tailed test at significance level $\\alpha = ${alpha}$:`),
        texBlock(`Z_{\\text{critical}} = \\pm ${criticalZ}`),
        txt("Compare the test statistic to the critical value:"),
        texBlock(`|Z| = ${absZ.toFixed(4)} ${reject ? ">" : "\\leq"} ${criticalZ}`),
        highlight(reject
          ? `Since $|Z| = ${absZ.toFixed(4)} > ${criticalZ}$, we reject the null hypothesis.`
          : `Since $|Z| = ${absZ.toFixed(4)} \\leq ${criticalZ}$, we fail to reject the null hypothesis.`),
      ],
    });

    // p-value
    const pValue = absZ > 4 ? "< 0.0001" : (2 * (1 - approxNormalCDF(absZ))).toFixed(6);
    steps.push({
      title: "Step 9 — p-Value",
      type: "pvalue",
      content: [
        txt("The p-value represents the probability of observing a difference at least as extreme as the one found, assuming the null hypothesis is true:"),
        texBlock(`p\\text{-value} \\approx ${pValue}`),
        txt(reject
          ? `This p-value is well below the significance level of ${alpha}, providing strong evidence against the null hypothesis.`
          : `This p-value exceeds the significance level of ${alpha}, so we do not have sufficient evidence to reject the null hypothesis.`),
      ],
    });

    // Conclusion
    steps.push({
      title: "Final Conclusion",
      type: "conclusion",
      content: [
        txt(reject
          ? `There is statistically significant evidence at the $\\alpha = ${alpha}$ level that the two population proportions are different ($\\hat{p}_1 = ${p1.toFixed(4)}$ vs $\\hat{p}_2 = ${p2.toFixed(4)}$).`
          : `There is not enough evidence at the $\\alpha = ${alpha}$ level to conclude that the two population proportions differ ($\\hat{p}_1 = ${p1.toFixed(4)}$ vs $\\hat{p}_2 = ${p2.toFixed(4)}$).`),
      ],
    });
  }
}

function buildOneSampleZSteps(
  steps: FormattedStep[],
  aiData: NonNullable<Parameters<typeof formatSolution>[1]>,
  ev: Record<string, any>,
  answer: string
) {
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
    const content: ContentBlock[] = [txt("From the problem statement we identify the following known quantities:")];
    for (const [key, val] of Object.entries(ev)) {
      const sym = VAR_LABELS[key] || key;
      const name = VAR_NAMES[key] || key.replace(/_/g, " ");
      content.push(texBlock(`\\text{${name}}\\;(${sym}) = ${val}`));
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
        txt("This formula standardizes the difference between the sample mean and the hypothesized population mean, measured in units of standard error."),
      ],
    });
  }

  // Compute standard error with progressive simplification
  if (ev.standard_deviation !== undefined && ev.sample_size !== undefined) {
    const sd = Number(ev.standard_deviation);
    const n = Number(ev.sample_size);
    const sqrtN = Math.sqrt(n);
    const se = sd / sqrtN;

    steps.push({
      title: "Step 5 — Calculate Standard Error",
      type: "computation",
      content: [
        txt("The standard error (SE) quantifies how much the sample mean is expected to vary from the true population mean. A smaller SE means the sample mean is a more precise estimate."),
        texBlock("SE = \\frac{\\sigma}{\\sqrt{n}}"),
        txt("Substitute the known values:"),
        texBlock(`SE = \\frac{${sd}}{\\sqrt{${n}}}`),
        txt("Simplify the denominator:"),
        texBlock(`SE = \\frac{${sd}}{${sqrtN}}`),
        highlight(`$SE = ${se}$`),
      ],
    });

    // Compute Z-score with progressive simplification
    if (ev.sample_mean !== undefined && ev.population_mean !== undefined) {
      const xbar = Number(ev.sample_mean);
      const mu = Number(ev.population_mean);
      const z = (xbar - mu) / se;

      steps.push({
        title: "Step 6 — Compute Z-Score",
        type: "computation",
        content: [
          txt("The Z-score tells us how many standard errors the sample mean is away from the hypothesized population mean:"),
          texBlock("Z = \\frac{\\bar{x} - \\mu}{SE}"),
          txt("Substitute the values:"),
          texBlock(`Z = \\frac{${xbar} - ${mu}}{${se}}`),
          txt("Compute the numerator:"),
          texBlock(`Z = \\frac{${xbar - mu}}{${se}}`),
          highlight(`$Z = ${z}$`),
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
          txt(`For a two-tailed test at significance level $\\alpha = ${alpha}$, the critical Z-values are:`),
          texBlock(`Z_{\\text{critical}} = \\pm ${criticalZ}`),
          txt("We compare the absolute value of the test statistic to the critical value:"),
          texBlock(`|Z| = ${absZ} ${reject ? ">" : "\\leq"} ${criticalZ}`),
          highlight(reject
            ? `Since $|Z| = ${absZ} > ${criticalZ}$, we reject the null hypothesis.`
            : `Since $|Z| = ${absZ} \\leq ${criticalZ}$, we fail to reject the null hypothesis.`),
        ],
      });

      // p-value
      const pValue = absZ > 4 ? "< 0.0001" : (2 * (1 - approxNormalCDF(absZ))).toFixed(6);
      steps.push({
        title: "Step 8 — p-Value",
        type: "pvalue",
        content: [
          txt("The p-value gives the probability of observing a result at least as extreme as the test statistic, assuming the null hypothesis is true:"),
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
            ? `Based on the Z-test, the sample with mean $\\bar{x} = ${xbar}$ is statistically significantly different from the hypothesized population mean $\\mu = ${mu}$. It is highly unlikely that this sample comes from the specified population.`
            : `Based on the Z-test, there is insufficient evidence to conclude that the sample mean $\\bar{x} = ${xbar}$ differs significantly from the population mean $\\mu = ${mu}$.`),
        ],
      });

      return;
    }
  }
}

function buildCalculusSteps(
  steps: FormattedStep[],
  aiData: NonNullable<Parameters<typeof formatSolution>[1]>,
  answer: string,
  resultPods: ClassifiedPod[]
) {
  // Identify the rule
  if (aiData.formula) {
    steps.push({
      title: "Step 2 — Rule / Method Applied",
      type: "formula",
      content: [
        txt("We apply the following differentiation or integration rule:"),
        texBlock(aiData.formula),
        txt("This rule governs how the expression transforms under the given operation."),
      ],
    });
  }

  // AI computation steps with explanations
  if (aiData.steps?.length) {
    aiData.steps.forEach((s, i) => {
      const content: ContentBlock[] = [txt(s.detail)];
      // If the detail looks like it contains a formula, try to render it
      const latexMatch = s.detail.match(/([a-zA-Z_]+\s*=\s*.+)/);
      if (latexMatch) {
        content.push(texBlock(latexMatch[1]));
      }
      steps.push({
        title: `Step ${i + 3} — ${s.title}`,
        type: "computation",
        content,
      });
    });
  }

  // Show Wolfram result pods as worked steps
  for (const pod of resultPods) {
    if (pod.text) {
      const latex = tryLatexify(pod.text);
      steps.push({
        title: pod.title,
        type: "computation",
        content: [
          ...(latex ? [texBlock(latex)] : [txt(pod.text)]),
        ],
      });
    }
  }

  steps.push({
    title: "Final Result",
    type: "conclusion",
    content: [txt("Therefore, applying the rules of calculus, the result is:"), highlight(answer)],
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
        txt("We begin with the given equation:"),
        texBlock(aiData.formula),
        txt("Our goal is to find the value(s) of the unknown variable that satisfy this equation."),
      ],
    });
  }

  // Try to detect quadratic and show formula
  const quadMatch = answer.match(/x\s*=\s*([-\d.]+)\s*(and|,|or)\s*x\s*=\s*([-\d.]+)/i) ||
                     answer.match(/x\s*=\s*([-\d.]+)/);
  if (aiData.formula && /x\^2|x²/.test(aiData.formula)) {
    steps.push({
      title: "Step 3 — Apply the Quadratic Formula",
      type: "computation",
      content: [
        txt("For a quadratic equation $ax^2 + bx + c = 0$, we use the quadratic formula:"),
        texBlock("x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"),
        txt("First, identify the coefficients $a$, $b$, and $c$ from the equation. Then substitute into the formula and simplify."),
      ],
    });
  }

  if (aiData.steps?.length) {
    aiData.steps.forEach((s, i) => {
      steps.push({
        title: `Step ${steps.length + 1} — ${s.title}`,
        type: "computation",
        content: [txt(s.detail)],
      });
    });
  }

  // Show relevant result pods (roots, alternate forms)
  for (const pod of resultPods.slice(0, 3)) {
    if (pod.text) {
      const latex = tryLatexify(pod.text);
      steps.push({
        title: pod.title,
        type: "info",
        content: [
          ...(latex ? [texBlock(latex)] : [txt(pod.text)]),
        ],
      });
    }
  }

  steps.push({
    title: "Final Result",
    type: "conclusion",
    content: [txt("The solution to the equation is:"), highlight(answer)],
  });
}

function buildProbabilitySteps(
  steps: FormattedStep[],
  aiData: NonNullable<Parameters<typeof formatSolution>[1]>,
  answer: string,
  resultPods: ClassifiedPod[]
) {
  if (aiData.formula) {
    steps.push({
      title: "Step 2 — Identify Distribution / Formula",
      type: "formula",
      content: [
        txt("We identify the appropriate probability model and formula:"),
        texBlock(aiData.formula),
        txt("This formula allows us to calculate the required probability or expected value."),
      ],
    });
  }

  if (aiData.extractedValues && Object.keys(aiData.extractedValues).length > 0) {
    const content: ContentBlock[] = [txt("From the problem, we extract the following parameters:")];
    for (const [key, val] of Object.entries(aiData.extractedValues)) {
      const sym = VAR_LABELS[key] || key;
      const name = VAR_NAMES[key] || key.replace(/_/g, " ");
      content.push(texBlock(`\\text{${name}}\\;(${sym}) = ${val}`));
    }
    steps.push({ title: "Step 3 — Extract Parameters", type: "values", content });
  }

  if (aiData.steps?.length) {
    aiData.steps.forEach((s, i) => {
      steps.push({
        title: `Step ${steps.length + 1} — ${s.title}`,
        type: "computation",
        content: [txt(s.detail)],
      });
    });
  }

  for (const pod of resultPods.slice(0, 2)) {
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
    content: [txt("The computed probability / expected value is:"), highlight(answer)],
  });
}

function buildLinearAlgebraSteps(
  steps: FormattedStep[],
  aiData: NonNullable<Parameters<typeof formatSolution>[1]>,
  answer: string,
  resultPods: ClassifiedPod[]
) {
  if (aiData.formula) {
    steps.push({
      title: "Step 2 — Matrix / System Setup",
      type: "formula",
      content: [
        txt("We set up the matrix or system of equations:"),
        texBlock(aiData.formula),
      ],
    });
  }

  if (aiData.steps?.length) {
    aiData.steps.forEach((s, i) => {
      steps.push({
        title: `Step ${steps.length + 1} — ${s.title}`,
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
    title: "Final Result",
    type: "conclusion",
    content: [txt("The result is:"), highlight(answer)],
  });
}

function buildGenericSteps(
  steps: FormattedStep[],
  aiData: NonNullable<Parameters<typeof formatSolution>[1]> | undefined,
  answer: string,
  resultPods: ClassifiedPod[]
) {
  if (aiData?.extractedValues && Object.keys(aiData.extractedValues).length > 0) {
    const content: ContentBlock[] = [txt("The following values were identified from the problem:")];
    for (const [key, val] of Object.entries(aiData.extractedValues)) {
      const sym = VAR_LABELS[key] || key;
      const name = VAR_NAMES[key] || key.replace(/_/g, " ");
      content.push(texBlock(`\\text{${name}}\\;(${sym}) = ${val}`));
    }
    steps.push({ title: "Step 2 — Known Values", type: "values", content });
  }

  if (aiData?.formula) {
    steps.push({
      title: "Step 3 — Formula / Method",
      type: "formula",
      content: [txt("Applying the relevant formula:"), texBlock(aiData.formula)],
    });
  }

  if (aiData?.steps?.length) {
    aiData.steps.forEach((s, i) => {
      steps.push({
        title: `Step ${steps.length + 1} — ${s.title}`,
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
      if (aiData) buildStatisticsSteps(steps, aiData, answer, originalQuery);
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
    case "probability":
      if (aiData) buildProbabilitySteps(steps, aiData, answer, resultPods);
      else buildGenericSteps(steps, aiData, answer, resultPods);
      break;
    case "linear_algebra":
      if (aiData) buildLinearAlgebraSteps(steps, aiData, answer, resultPods);
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
