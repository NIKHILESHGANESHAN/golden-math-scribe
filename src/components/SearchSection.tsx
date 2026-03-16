import { useState, useRef, useCallback } from "react";
import { Search, Keyboard, Lightbulb, ChevronRight, Loader2, Upload, Camera, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MathKeyboard from "./MathKeyboard";
import StepSolution from "./StepSolution";
import NormalDistribution from "./NormalDistribution";
import { addToHistory } from "@/lib/history";
import { supabase } from "@/integrations/supabase/client";
import * as math from "mathjs";
import { formatSolution, type FormattedSolution } from "@/lib/solutionFormatter";
import { getCachedSolution, cacheSolution } from "@/lib/solutionCache";

const placeholders = [
  "solve quadratic equation x² − 5x + 6 = 0",
  "derivative of sin(x²)",
  "integrate x³ from 0 to 2",
  "A sample of 100 students has mean height 160cm. Test if population mean is 165cm with SD 10cm.",
  "find eigenvalues of [[2,1],[1,3]]",
  "limit of (sin x)/x as x → 0",
  "720 out of 1000 men and 650 out of 1200 women passed. Is there a significant difference?",
];

type SolveStage = "idle" | "cached" | "interpreting" | "computing" | "verifying" | "fallback" | "done" | "error";

const stageMessages: Record<SolveStage, string> = {
  idle: "",
  cached: "Retrieved from cache…",
  interpreting: "Analyzing problem…",
  computing: "Computing solution using Wolfram Alpha…",
  verifying: "Cross-verifying with local engine…",
  fallback: "Trying local math engine…",
  done: "",
  error: "",
};

// ── Enhanced local evaluation ──────────────────────────────────────
function localEvaluate(query: string): string | null {
  // Direct evaluation
  try {
    const result = math.evaluate(query);
    if (result !== undefined && result !== null) {
      return typeof result === "object" && result.toString ? result.toString() : String(result);
    }
  } catch { /* not evaluable */ }

  // Derivative
  try {
    const derivMatch = query.match(/derivative\s+of\s+(.+)/i) || query.match(/differentiate\s+(.+)/i);
    if (derivMatch) {
      const expr = derivMatch[1].replace(/\s+with\s+respect\s+to\s+\w+/i, "").trim();
      return math.derivative(expr, "x").toString();
    }
  } catch { /* skip */ }

  // Simplification
  try {
    const simpMatch = query.match(/simplify\s+(.+)/i);
    if (simpMatch) {
      const node = math.parse(simpMatch[1].trim());
      return math.simplify(node).toString();
    }
  } catch { /* skip */ }

  // Solve linear/quadratic (parse "solve ... = 0")
  try {
    const solveMatch = query.match(/solve\s+(.+?)\s*=\s*0/i);
    if (solveMatch) {
      const expr = solveMatch[1].trim();
      // Try mathjs rationalize for polynomial roots
      const rationalized = math.rationalize(expr);
      if (rationalized) return `Simplified: ${rationalized.toString()}`;
    }
  } catch { /* skip */ }

  // Factorial
  try {
    const factMatch = query.match(/(\d+)\s*!/);
    if (factMatch) {
      return String(math.factorial(Number(factMatch[1])));
    }
  } catch { /* skip */ }

  return null;
}

function localFallback(query: string): FormattedSolution | null {
  // Direct numeric evaluation
  try {
    const result = math.evaluate(query);
    if (result !== undefined && result !== null) {
      const resultStr = typeof result === "object" && result.toString ? result.toString() : String(result);
      return {
        steps: [
          { title: "Step 1 — Input", content: [{ kind: "text", value: query }], type: "interpretation" },
          { title: "Step 2 — Computation", content: [{ kind: "text", value: "Evaluated using local math engine." }, { kind: "latex-block", value: `${query} = ${resultStr}` }], type: "computation" },
          { title: "Conclusion", content: [{ kind: "highlight", value: `The result is: ${resultStr}` }], type: "conclusion" },
        ],
        answer: resultStr,
        images: [],
        category: "arithmetic",
        interpretation: `Direct evaluation of: ${query}`,
        verification: { status: "verified", message: "Computed locally." },
      };
    }
  } catch { /* Not a simple expression */ }

  // Derivative
  try {
    const derivMatch = query.match(/derivative\s+of\s+(.+)/i) || query.match(/differentiate\s+(.+)/i);
    if (derivMatch) {
      const expr = derivMatch[1].replace(/\s+with\s+respect\s+to\s+\w+/i, "").trim();
      const derivative = math.derivative(expr, "x");
      return {
        steps: [
          { title: "Step 1 — Problem Interpretation", content: [{ kind: "text", value: `Find the derivative of ${expr} with respect to x.` }], type: "interpretation" },
          { title: "Step 2 — Differentiation Rule", content: [{ kind: "text", value: "Applied standard differentiation rules:" }, { kind: "latex-block", value: `\\frac{d}{dx}\\left[${expr}\\right]` }], type: "formula" },
          { title: "Step 3 — Result", content: [{ kind: "text", value: "After applying the appropriate rules:" }, { kind: "latex-block", value: `\\frac{d}{dx}\\left[${expr}\\right] = ${derivative.toString()}` }], type: "computation" },
          { title: "Conclusion", content: [{ kind: "highlight", value: `The derivative is: ${derivative.toString()}` }], type: "conclusion" },
        ],
        answer: derivative.toString(),
        images: [],
        category: "calculus",
        formula: `\\frac{d}{dx}\\left[${expr}\\right]`,
        verification: { status: "verified", message: "Computed locally with symbolic engine." },
      };
    }
  } catch { /* Not differentiable */ }

  // Simplify
  try {
    const simpMatch = query.match(/simplify\s+(.+)/i);
    if (simpMatch) {
      const expr = simpMatch[1].trim();
      const simplified = math.simplify(expr);
      return {
        steps: [
          { title: "Step 1 — Input", content: [{ kind: "text", value: `Simplify: ${expr}` }], type: "interpretation" },
          { title: "Step 2 — Simplification", content: [{ kind: "text", value: "Applied algebraic simplification rules:" }, { kind: "latex-block", value: `${expr} \\;\\Rightarrow\\; ${simplified.toString()}` }], type: "computation" },
          { title: "Conclusion", content: [{ kind: "highlight", value: `Simplified result: ${simplified.toString()}` }], type: "conclusion" },
        ],
        answer: simplified.toString(),
        images: [],
        category: "algebra",
        verification: { status: "verified", message: "Simplified locally." },
      };
    }
  } catch { /* skip */ }

  return null;
}

/** Normalize an answer string for fuzzy comparison */
function normalizeAnswer(s: string): string {
  return s.replace(/\s+/g, "").replace(/[{}()]/g, "").toLowerCase().trim();
}

/** Extract Z-score & critical value from a formatted solution for visualization */
function extractStatsViz(sol: FormattedSolution): { zScore: number; criticalValue: number; twoTailed: boolean } | null {
  if (!sol.category?.toLowerCase().includes("statistic")) return null;
  let zScore: number | null = null;
  let criticalValue = 1.96;
  let twoTailed = true;

  for (const step of sol.steps) {
    for (const block of step.content || []) {
      const val = block.value || "";
      // Extract Z score
      const zMatch = val.match(/Z\s*=\s*(-?[\d.]+)/);
      if (zMatch) zScore = parseFloat(zMatch[1]);
      // Extract critical value
      const critMatch = val.match(/Z_\{\\text\{critical\}\}\s*=\s*[±]?\s*([\d.]+)/);
      if (critMatch) criticalValue = parseFloat(critMatch[1]);
      // Detect one-tailed
      if (/one[- ]?tailed/i.test(val)) twoTailed = false;
    }
  }

  return zScore !== null ? { zScore, criticalValue, twoTailed } : null;
}

// ── Global context for AI tutor ────────────────────────────────────
let lastSolvedContext: { query: string; answer: string; category?: string } | null = null;

export function getLastSolvedContext() {
  return lastSolvedContext;
}

// ── Quick examples ─────────────────────────────────────────────────
const quickExamples = [
  { label: "x² − 5x + 6 = 0", category: "Algebra" },
  { label: "derivative of sin(x²)", category: "Calculus" },
  { label: "integrate x³ from 0 to 2", category: "Calculus" },
  { label: "z-test: sample mean 160, pop mean 165, sd 10, n=100", category: "Statistics" },
  { label: "720 out of 1000 and 650 out of 1200. Significant difference?", category: "Statistics" },
  { label: "find eigenvalues of [[2,1],[1,3]]", category: "Linear Algebra" },
  { label: "limit of (sin x)/x as x → 0", category: "Calculus" },
  { label: "10 choose 4", category: "Combinatorics" },
];

const SearchSection = () => {
  const [query, setQuery] = useState("");
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [solution, setSolution] = useState<FormattedSolution | null>(null);
  const [practiceMode, setPracticeMode] = useState(false);
  const [stage, setStage] = useState<SolveStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [statsViz, setStatsViz] = useState<{ zScore: number; criticalValue: number; twoTailed: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const placeholder = placeholders[Math.floor(Date.now() / 10000) % placeholders.length];

  const solveQuery = useCallback(async (q: string) => {
    if (!q.trim()) return;

    // Check cache first
    const cached = getCachedSolution(q);
    if (cached) {
      setStage("cached");
      setSolution(cached);
      setStatsViz(extractStatsViz(cached));
      lastSolvedContext = { query: q, answer: cached.answer, category: cached.category };
      setError(null);
      setUploadedImage(null);
      setTimeout(() => setStage("done"), 300);
      return;
    }

    setStage("interpreting");
    setError(null);
    setSolution(null);
    setUploadedImage(null);
    setStatsViz(null);

    try {
      // Stage 1: AI Interpreter
      const { data: interpreted, error: interpError } = await supabase.functions.invoke("math-interpreter", {
        body: { query: q },
      });

      if (interpError) throw new Error(interpError.message);

      if (!interpreted?.success || !interpreted?.wolframQuery) {
        // Fallback: send raw query
        setStage("computing");
        const { data: wolfData, error: wolfErr } = await supabase.functions.invoke("wolfram-query", {
          body: { query: q },
        });
        if (wolfErr) throw new Error(wolfErr.message);
        if (wolfData?.success && wolfData?.pods) {
          setStage("verifying");
          const localResult = localEvaluate(q);
          const wolframAnswer = wolfData.pods.find((p: any) => /result|solution|value/i.test(p.title))?.subpods?.[0]?.plaintext || "";
          const localVerification = localResult
            ? { answer: localResult, match: normalizeAnswer(localResult).includes(normalizeAnswer(wolframAnswer)) || normalizeAnswer(wolframAnswer).includes(normalizeAnswer(localResult)) }
            : null;

          const result = formatSolution(wolfData.pods, undefined, q, localVerification);
          result.interpretation = q;
          setSolution(result);
          setStatsViz(extractStatsViz(result));
          cacheSolution(q, result);
          lastSolvedContext = { query: q, answer: result.answer, category: result.category };
          addToHistory({ type: "search", query: q, answer: result.answer });
          setStage("done");
          return;
        }
        throw new Error("no_result");
      }

      // Stage 2: Wolfram with optimized query
      setStage("computing");
      const { data: wolfData, error: wolfErr } = await supabase.functions.invoke("wolfram-query", {
        body: {
          query: interpreted.wolframQuery,
          alternateQueries: interpreted.alternateQueries || [],
        },
      });

      if (wolfErr) throw new Error(wolfErr.message);

      if (wolfData?.success && wolfData?.pods) {
        setStage("verifying");
        const localResult = localEvaluate(interpreted.wolframQuery) || localEvaluate(q);
        const wolframAnswer = wolfData.pods.find((p: any) => /result|solution|value|roots/i.test(p.title))?.subpods?.[0]?.plaintext || "";
        const localVerification = localResult
          ? { answer: localResult, match: normalizeAnswer(localResult).includes(normalizeAnswer(wolframAnswer)) || normalizeAnswer(wolframAnswer).includes(normalizeAnswer(localResult)) }
          : null;

        const result = formatSolution(wolfData.pods, {
          category: interpreted.category,
          interpretation: interpreted.interpretation,
          formula: interpreted.formula,
          steps: interpreted.steps,
          extractedValues: interpreted.extractedValues,
        }, q, localVerification);
        setSolution(result);
        setStatsViz(extractStatsViz(result));
        cacheSolution(q, result);
        lastSolvedContext = { query: q, answer: result.answer, category: result.category };
        addToHistory({ type: "search", query: q, answer: result.answer });
        setStage("done");
        return;
      }

      // Stage 3: Local fallback
      setStage("fallback");
      const localResult = localFallback(q);
      if (localResult) {
        if (interpreted.interpretation) {
          localResult.steps.unshift({
            title: "Problem Interpretation",
            content: [{ kind: "text", value: interpreted.interpretation }],
            type: "interpretation",
          });
        }
        localResult.category = interpreted.category;
        localResult.formula = interpreted.formula;
        setSolution(localResult);
        setStatsViz(extractStatsViz(localResult));
        cacheSolution(q, localResult);
        lastSolvedContext = { query: q, answer: localResult.answer, category: localResult.category };
        addToHistory({ type: "search", query: q, answer: localResult.answer });
        setStage("done");
        return;
      }

      // If AI gave us steps, show those as best effort
      if (interpreted.steps?.length) {
        const aiResult: FormattedSolution = {
          steps: [
            { title: "Step 1 — Problem Interpretation", content: [{ kind: "text" as const, value: interpreted.interpretation || q }], type: "interpretation" as const },
            ...interpreted.steps.map((s: any) => ({ title: s.title, content: [{ kind: "text" as const, value: s.detail }], type: "computation" as const })),
            { title: "Conclusion", content: [{ kind: "highlight" as const, value: interpreted.extractedValues
              ? `Extracted values: ${JSON.stringify(interpreted.extractedValues)}`
              : "Could not compute a final numerical answer." }], type: "conclusion" as const },
          ],
          answer: interpreted.extractedValues
            ? `Extracted values: ${JSON.stringify(interpreted.extractedValues)}`
            : "Could not compute a final numerical answer.",
          images: [],
          category: interpreted.category,
          formula: interpreted.formula,
          interpretation: interpreted.interpretation,
          verification: { status: "unverified", message: "Only AI interpretation available — no computational verification." },
        };
        setSolution(aiResult);
        lastSolvedContext = { query: q, answer: aiResult.answer, category: aiResult.category };
        setStage("done");
        return;
      }

      throw new Error("no_result");
    } catch (err: any) {
      console.error("Solver pipeline failed:", err);
      setError("No exact result found. Try rephrasing the math query.");
      setStage("error");
    }
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64Full = ev.target?.result as string;
      setUploadedImage(base64Full);
      const base64Data = base64Full.split(",")[1];

      setStage("interpreting");
      setError(null);
      setSolution(null);

      try {
        const { data, error: ocrErr } = await supabase.functions.invoke("ocr-math", {
          body: { imageBase64: base64Data },
        });

        if (ocrErr || !data?.success || !data?.text) {
          throw new Error("OCR failed");
        }

        setQuery(data.text);
        await solveQuery(data.text);
      } catch (err) {
        console.error("Image OCR failed:", err);
        setError("Could not extract math from the image. Try typing the problem instead.");
        setStage("error");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSearch = () => solveQuery(query);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };
  const insertSymbol = (value: string) => {
    setQuery((prev) => prev + value);
    inputRef.current?.focus();
  };

  const loading = stage !== "idle" && stage !== "done" && stage !== "error" && stage !== "cached";

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      {/* Search bar */}
      <div className="relative">
        <div className="flex items-center gap-3 rounded-2xl bg-card golden-border elevated-shadow px-5 py-4 transition-all focus-within:glow-shadow">
          <Search className="h-5 w-5 text-primary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Example: ${placeholder}`}
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-lg font-body"
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
            title="Upload math image"
          >
            <Camera className="h-5 w-5 text-muted-foreground" />
          </button>

          <button
            onClick={() => setShowKeyboard(!showKeyboard)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
            title="Math keyboard"
          >
            <Keyboard className="h-5 w-5 text-muted-foreground" />
          </button>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Solve
          </button>
        </div>

        <AnimatePresence>
          {showKeyboard && (
            <div className="mt-3">
              <MathKeyboard onInsert={insertSymbol} visible={showKeyboard} />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Uploaded image preview */}
      <AnimatePresence>
        {uploadedImage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 relative inline-block"
          >
            <img
              src={uploadedImage}
              alt="Uploaded math problem"
              className="max-h-40 rounded-xl border border-border"
            />
            <button
              onClick={() => setUploadedImage(null)}
              className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-body text-center"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick examples */}
      {!solution && !loading && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8"
        >
          <div className="flex flex-wrap justify-center gap-2">
            {quickExamples.map((ex) => (
              <button
                key={ex.label}
                onClick={() => {
                  setQuery(ex.label);
                  solveQuery(ex.label);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm hover:bg-primary/10 hover:text-primary transition-all"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                <span className="max-w-[200px] truncate">{ex.label}</span>
                <span className="text-[10px] text-muted-foreground">{ex.category}</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Multi-stage loading */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8 text-center"
        >
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
          <p className="text-muted-foreground font-body">{stageMessages[stage]}</p>

          {/* Stage indicators */}
          <div className="flex items-center justify-center gap-3 mt-4">
            {(["interpreting", "computing", "verifying"] as SolveStage[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full transition-all ${
                    s === stage
                      ? "bg-primary animate-pulse"
                      : (["interpreting", "computing", "verifying"].indexOf(stage) > i)
                        ? "bg-primary"
                        : "bg-muted"
                  }`}
                />
                <span className={`text-xs ${s === stage ? "text-primary font-medium" : "text-muted-foreground"}`}>
                  {s === "interpreting" ? "Analyze" : s === "computing" ? "Solve" : "Verify"}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Solution */}
      <AnimatePresence>
        {solution && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-8"
          >
            {/* Category & interpretation badge */}
            {(solution.category || solution.interpretation) && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {solution.category && (
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium uppercase tracking-wider">
                    {solution.category}
                  </span>
                )}
              </div>
            )}

            {/* Mode toggle */}
            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={() => setPracticeMode(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  !practiceMode ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}
              >
                Solution Mode
              </button>
              <button
                onClick={() => setPracticeMode(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  practiceMode ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}
              >
                Practice Mode
              </button>
              <button
                onClick={() => {
                  setSolution(null);
                  setQuery("");
                  setError(null);
                  setStage("idle");
                  setStatsViz(null);
                }}
                className="ml-auto text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            </div>

            <StepSolution
              steps={solution.steps}
              answer={solution.answer}
              answerFormula={solution.answerFormula}
              practiceMode={practiceMode}
              formula={solution.formula}
              verification={solution.verification}
            />

            {/* Normal distribution visualization for stats */}
            {statsViz && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6"
              >
                <NormalDistribution
                  zScore={statsViz.zScore}
                  criticalValue={statsViz.criticalValue}
                  twoTailed={statsViz.twoTailed}
                  label="Statistical Distribution"
                />
              </motion.div>
            )}

            {/* Wolfram images */}
            {solution.images && solution.images.length > 0 && (
              <div className="mt-6 space-y-3">
                {solution.images.map((src, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-4 rounded-xl bg-card golden-border card-shadow flex justify-center"
                  >
                    <img src={src} alt={`Plot ${i + 1}`} className="max-w-full rounded-lg" />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchSection;
