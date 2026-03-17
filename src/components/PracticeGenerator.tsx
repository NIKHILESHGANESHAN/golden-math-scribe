import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dices, Lightbulb, Check, X, ChevronRight, Loader2, RotateCcw } from "lucide-react";
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';

interface PracticeProblem {
  question: string;
  answer: string;
  hints: string[];
  difficulty: "easy" | "medium" | "hard";
}

const problemSets: Record<string, PracticeProblem[]> = {
  Algebra: [
    { question: "Solve: 2x + 7 = 15", answer: "x = 4", hints: ["Subtract 7 from both sides", "Divide by 2"], difficulty: "easy" },
    { question: "Solve: x² − 9 = 0", answer: "x = 3 or x = -3", hints: ["Factor as difference of squares", "(x+3)(x-3) = 0"], difficulty: "easy" },
    { question: "Solve: x² + 4x − 12 = 0", answer: "x = 2 or x = -6", hints: ["Try factoring or use the quadratic formula", "Find two numbers that multiply to -12 and add to 4"], difficulty: "medium" },
    { question: "Simplify: (x² − 4) / (x − 2)", answer: "x + 2", hints: ["Factor the numerator", "x² − 4 = (x+2)(x−2)"], difficulty: "medium" },
    { question: "Solve: |2x − 5| = 3", answer: "x = 4 or x = 1", hints: ["Split into two cases: 2x−5 = 3 and 2x−5 = −3", "Solve each linear equation"], difficulty: "medium" },
    { question: "Solve: 3^(x+1) = 81", answer: "x = 3", hints: ["Express 81 as a power of 3", "81 = 3⁴, so x+1 = 4"], difficulty: "hard" },
  ],
  Calculus: [
    { question: "Find d/dx(3x² + 2x − 5)", answer: "6x + 2", hints: ["Apply the power rule to each term", "d/dx(xⁿ) = nxⁿ⁻¹"], difficulty: "easy" },
    { question: "Find d/dx(sin(3x))", answer: "3cos(3x)", hints: ["Use the chain rule", "d/dx[sin(u)] = cos(u)·u'"], difficulty: "easy" },
    { question: "Evaluate: ∫ 4x³ dx", answer: "x⁴ + C", hints: ["Reverse the power rule", "∫xⁿ dx = xⁿ⁺¹/(n+1) + C"], difficulty: "easy" },
    { question: "Find d/dx(x² · eˣ)", answer: "eˣ(x² + 2x)", hints: ["Use the product rule: (fg)' = f'g + fg'", "f = x², g = eˣ"], difficulty: "medium" },
    { question: "Evaluate: ∫₀¹ (3x² + 1) dx", answer: "2", hints: ["Integrate: x³ + x", "Evaluate at bounds: F(1) − F(0)"], difficulty: "medium" },
    { question: "Find the limit: lim(x→0) (eˣ − 1)/x", answer: "1", hints: ["This is a 0/0 form", "Apply L'Hôpital's Rule or use Taylor series"], difficulty: "hard" },
  ],
  Statistics: [
    { question: "Find the mean of: 4, 8, 6, 2, 10", answer: "6", hints: ["Sum all values", "Divide by count: (4+8+6+2+10)/5"], difficulty: "easy" },
    { question: "Find the median of: 3, 7, 1, 9, 5", answer: "5", hints: ["Sort the values: 1, 3, 5, 7, 9", "Pick the middle value"], difficulty: "easy" },
    { question: "Z-score: x=85, μ=70, σ=10", answer: "Z = 1.5", hints: ["Z = (x − μ) / σ", "Z = (85 − 70) / 10"], difficulty: "medium" },
    { question: "Standard error: σ=12, n=36", answer: "SE = 2", hints: ["SE = σ / √n", "SE = 12 / √36 = 12/6"], difficulty: "medium" },
    { question: "P(X ≤ 1) for Binomial(n=3, p=0.5)", answer: "0.5", hints: ["P(0) + P(1)", "P(0) = C(3,0)(0.5)³ = 0.125, P(1) = C(3,1)(0.5)³ = 0.375"], difficulty: "hard" },
  ],
  Trigonometry: [
    { question: "sin(30°) = ?", answer: "0.5 or 1/2", hints: ["Use the unit circle", "sin(30°) = opposite/hypotenuse in a 30-60-90 triangle"], difficulty: "easy" },
    { question: "If sin(θ) = 3/5, find cos(θ)", answer: "4/5", hints: ["Use sin²θ + cos²θ = 1", "cos²θ = 1 − 9/25 = 16/25"], difficulty: "medium" },
    { question: "Simplify: sin(2x)/sin(x)", answer: "2cos(x)", hints: ["Use double angle: sin(2x) = 2sin(x)cos(x)", "Divide by sin(x)"], difficulty: "medium" },
  ],
  Probability: [
    { question: "Two dice: P(sum = 7)?", answer: "1/6", hints: ["Count favorable outcomes: (1,6),(2,5),(3,4),(4,3),(5,2),(6,1)", "6 out of 36 total"], difficulty: "medium" },
    { question: "P(A∪B) if P(A)=0.3, P(B)=0.5, P(A∩B)=0.1", answer: "0.7", hints: ["P(A∪B) = P(A) + P(B) − P(A∩B)", "= 0.3 + 0.5 − 0.1"], difficulty: "easy" },
    { question: "E[X] for X: {1:0.2, 2:0.3, 3:0.5}", answer: "2.3", hints: ["E[X] = Σ x·P(x)", "= 1(0.2) + 2(0.3) + 3(0.5)"], difficulty: "medium" },
  ],
};

const categories = Object.keys(problemSets);
const difficulties = ["easy", "medium", "hard"] as const;

const PracticeGenerator = () => {
  const [category, setCategory] = useState(categories[0]);
  const [difficulty, setDifficulty] = useState<typeof difficulties[number]>("medium");
  const [currentProblem, setCurrentProblem] = useState<PracticeProblem | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [showHints, setShowHints] = useState(0);
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const generateProblem = useCallback(() => {
    const pool = problemSets[category].filter(p => p.difficulty === difficulty);
    const fallback = pool.length > 0 ? pool : problemSets[category];
    const problem = fallback[Math.floor(Math.random() * fallback.length)];
    setCurrentProblem(problem);
    setUserAnswer("");
    setShowHints(0);
    setResult(null);
  }, [category, difficulty]);

  const checkAnswer = () => {
    if (!currentProblem || !userAnswer.trim()) return;
    const normalize = (s: string) => s.replace(/\s+/g, "").toLowerCase().replace(/[()]/g, "");
    const correct = normalize(userAnswer).includes(normalize(currentProblem.answer.split(" or ")[0])) ||
      normalize(currentProblem.answer).includes(normalize(userAnswer));
    setResult(correct ? "correct" : "incorrect");
    setScore(s => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
  };

  const difficultyColors = {
    easy: "bg-green-500/10 text-green-600 border-green-500/20",
    medium: "bg-primary/10 text-primary border-primary/20",
    hard: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground mb-2">Practice Problems</h2>
          <p className="text-muted-foreground font-body">Generate problems and test your skills</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-display font-bold text-primary">{score.correct}/{score.total}</p>
          <p className="text-xs text-muted-foreground font-body">Score</p>
        </div>
      </div>

      {/* Category selection */}
      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => { setCategory(cat); setCurrentProblem(null); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium font-body transition-all ${
              category === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-primary/10"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Difficulty */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm text-muted-foreground font-body">Difficulty:</span>
        {difficulties.map(d => (
          <button
            key={d}
            onClick={() => { setDifficulty(d); setCurrentProblem(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-all ${
              difficulty === d ? difficultyColors[d] : "bg-secondary text-secondary-foreground border-transparent"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Generate button */}
      {!currentProblem && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <Dices className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <button
            onClick={generateProblem}
            className="px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-display font-semibold text-lg hover:opacity-90 transition-opacity flex items-center gap-3 mx-auto"
          >
            <Dices className="h-5 w-5" />
            Generate Problem
          </button>
        </motion.div>
      )}

      {/* Problem card */}
      <AnimatePresence mode="wait">
        {currentProblem && (
          <motion.div
            key={currentProblem.question}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="p-6 rounded-2xl bg-card golden-border elevated-shadow">
              <div className="flex items-center justify-between mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize border ${difficultyColors[currentProblem.difficulty]}`}>
                  {currentProblem.difficulty}
                </span>
                <span className="text-xs text-muted-foreground font-body">{category}</span>
              </div>

              <p className="text-xl font-display font-semibold text-foreground mb-6">
                {currentProblem.question}
              </p>

              {/* Hints */}
              {showHints > 0 && (
                <div className="space-y-2 mb-4">
                  {currentProblem.hints.slice(0, showHints).map((hint, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3 rounded-lg bg-primary/5 border border-primary/10 flex items-start gap-2"
                    >
                      <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-sm text-primary font-body">{hint}</p>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Result */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-lg mb-4 ${
                      result === "correct"
                        ? "bg-green-500/10 border border-green-500/20"
                        : "bg-destructive/10 border border-destructive/20"
                    }`}
                  >
                    {result === "correct" ? (
                      <div className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-green-600" />
                        <span className="text-green-700 font-medium font-body">Correct! Well done!</span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <X className="h-5 w-5 text-destructive" />
                          <span className="text-destructive font-medium font-body">Not quite right.</span>
                        </div>
                        <p className="text-sm text-muted-foreground font-body">Answer: <strong>{currentProblem.answer}</strong></p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input */}
              {!result && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && checkAnswer()}
                    placeholder="Your answer..."
                    className="flex-1 px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary transition-colors font-body"
                    autoFocus
                  />
                  <button onClick={checkAnswer} className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm">
                    Submit
                  </button>
                  <button
                    onClick={() => setShowHints(h => Math.min(h + 1, currentProblem.hints.length))}
                    className="px-4 py-3 rounded-xl bg-secondary text-secondary-foreground text-sm hover:bg-primary/10 transition-colors"
                    disabled={showHints >= currentProblem.hints.length}
                  >
                    Hint
                  </button>
                </div>
              )}

              {/* Next problem */}
              {result && (
                <button
                  onClick={generateProblem}
                  className="w-full px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Next Problem
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PracticeGenerator;
