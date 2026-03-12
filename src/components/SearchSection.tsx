import { useState, useRef } from "react";
import { Search, Keyboard, Lightbulb, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MathKeyboard from "./MathKeyboard";
import StepSolution from "./StepSolution";
import { addToHistory } from "@/lib/history";

const placeholders = [
  "solve quadratic equation x² − 5x + 6 = 0",
  "derivative of x² + 3x",
  "integrate sin(x)",
  "factor x² − 9",
  "limit of (1 + 1/n)^n as n → ∞",
];

// Mock step-by-step solutions
const mockSolve = (query: string): { steps: { title: string; explanation: string }[]; answer: string } => {
  const q = query.toLowerCase();
  if (q.includes("x²") && q.includes("5x") && q.includes("6")) {
    return {
      steps: [
        { title: "Identify the equation", explanation: "We have x² − 5x + 6 = 0, a quadratic equation in standard form ax² + bx + c = 0." },
        { title: "Find factors", explanation: "We need two numbers that multiply to 6 and add to −5. Those numbers are −2 and −3." },
        { title: "Factor the expression", explanation: "(x − 2)(x − 3) = 0" },
        { title: "Apply zero product property", explanation: "Set each factor equal to zero: x − 2 = 0 or x − 3 = 0" },
      ],
      answer: "x = 2 or x = 3",
    };
  }
  if (q.includes("derivative") || q.includes("diff")) {
    return {
      steps: [
        { title: "Identify the function", explanation: "f(x) = x² + 3x" },
        { title: "Apply power rule", explanation: "d/dx(xⁿ) = nxⁿ⁻¹. So d/dx(x²) = 2x" },
        { title: "Differentiate each term", explanation: "d/dx(x²) = 2x, d/dx(3x) = 3" },
      ],
      answer: "f'(x) = 2x + 3",
    };
  }
  if (q.includes("integrat") || q.includes("sin")) {
    return {
      steps: [
        { title: "Identify the integral", explanation: "∫ sin(x) dx" },
        { title: "Apply standard integral", explanation: "The integral of sin(x) is −cos(x)" },
        { title: "Add constant of integration", explanation: "Don't forget the constant C" },
      ],
      answer: "−cos(x) + C",
    };
  }
  return {
    steps: [
      { title: "Parse the problem", explanation: `Analyzing: "${query}"` },
      { title: "Apply relevant rules", explanation: "Applying mathematical rules and identities..." },
    ],
    answer: "Solution computed. Connect Wolfram Alpha API for accurate results.",
  };
};

const SearchSection = () => {
  const [query, setQuery] = useState("");
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [solution, setSolution] = useState<ReturnType<typeof mockSolve> | null>(null);
  const [practiceMode, setPracticeMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const placeholder = placeholders[Math.floor(Date.now() / 10000) % placeholders.length];

  const handleSearch = () => {
    if (!query.trim()) return;
    const result = mockSolve(query);
    setSolution(result);
    addToHistory({ type: "search", query, answer: result.answer });
  };

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
            className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
          >
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

      {/* Quick examples */}
      {!solution && (
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
                const result = mockSolve(ex);
                setSolution(result);
                addToHistory({ type: "search", query: ex, answer: result.answer });
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchSection;
