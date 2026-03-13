import { useState, useRef } from "react";
import { Search, Keyboard, Lightbulb, ChevronRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MathKeyboard from "./MathKeyboard";
import StepSolution from "./StepSolution";
import { addToHistory } from "@/lib/history";
import { supabase } from "@/integrations/supabase/client";

const placeholders = [
  "solve quadratic equation x² − 5x + 6 = 0",
  "derivative of x² + 3x",
  "integrate sin(x)",
  "factor x² − 9",
  "limit of (1 + 1/n)^n as n → ∞",
];

interface SolutionData {
  steps: { title: string; explanation: string }[];
  answer: string;
  images?: string[];
}

const parseWolframPods = (pods: any[]): SolutionData => {
  const steps: { title: string; explanation: string }[] = [];
  let answer = "";
  const images: string[] = [];

  for (const pod of pods) {
    const texts = pod.subpods
      ?.map((sp: any) => sp.plaintext)
      .filter((t: string) => t && t.trim())
      .join("\n");

    const podImages = pod.subpods
      ?.map((sp: any) => sp.img)
      .filter((img: string | null) => img);

    if (podImages?.length) {
      images.push(...podImages);
    }

    const title = pod.title || "Result";
    const lowerTitle = title.toLowerCase();

    if (lowerTitle.includes("result") || lowerTitle.includes("solution") || lowerTitle.includes("roots")) {
      answer = texts || answer;
      steps.push({ title, explanation: texts || "(see image)" });
    } else if (texts) {
      steps.push({ title, explanation: texts });
    }
  }

  if (!answer && steps.length > 0) {
    answer = steps[steps.length - 1].explanation;
  }

  if (steps.length === 0) {
    steps.push({ title: "Result", explanation: "No detailed steps available." });
    answer = answer || "See result above.";
  }

  return { steps, answer, images };
};

const SearchSection = () => {
  const [query, setQuery] = useState("");
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [solution, setSolution] = useState<SolutionData | null>(null);
  const [practiceMode, setPracticeMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const placeholder = placeholders[Math.floor(Date.now() / 10000) % placeholders.length];

  const solveQuery = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setSolution(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("wolfram-query", {
        body: { query: q },
      });

      if (fnError) throw new Error(fnError.message);

      if (data?.error || !data?.success) {
        setError("No exact result found. Try rephrasing the math query.");
        return;
      }

      const result = parseWolframPods(data.pods);
      setSolution(result);
      addToHistory({ type: "search", query: q, answer: result.answer });
    } catch (err: any) {
      console.error("Wolfram query failed:", err);
      setError("No exact result found. Try rephrasing the math query.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => solveQuery(query);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const insertSymbol = (value: string) => {
    setQuery((prev) => prev + value);
    inputRef.current?.focus();
  };

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
          className="mt-8 flex flex-wrap justify-center gap-2"
        >
          {["x² − 5x + 6 = 0", "derivative of x²", "integrate sin(x)"].map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setQuery(ex);
                solveQuery(ex);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm hover:bg-primary/10 hover:text-primary transition-all"
            >
              <Lightbulb className="h-3.5 w-3.5" />
              {ex}
              <ChevronRight className="h-3 w-3" />
            </button>
          ))}
        </motion.div>
      )}

      {/* Loading */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8 text-center text-muted-foreground font-body"
        >
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
          <p>Computing solution...</p>
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
                }}
                className="ml-auto text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            </div>

            <StepSolution
              steps={solution.steps}
              answer={solution.answer}
              practiceMode={practiceMode}
            />

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
                    <img src={src} alt={`Wolfram result ${i + 1}`} className="max-w-full" />
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
