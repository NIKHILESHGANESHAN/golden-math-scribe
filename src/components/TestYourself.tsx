import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";
import { addToHistory } from "@/lib/history";

interface Question {
  id: number;
  question: string;
  answer: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
}

const questionPool = [
  { question: "What is 7 × 8?", answer: "56" },
  { question: "√144 = ?", answer: "12" },
  { question: "15% of 200?", answer: "30" },
  { question: "2⁵ = ?", answer: "32" },
  { question: "sin(90°) = ?", answer: "1" },
  { question: "Factor: x² − 4", answer: "(x+2)(x-2)" },
  { question: "d/dx(x³) = ?", answer: "3x²" },
  { question: "∫2x dx = ?", answer: "x²+C" },
  { question: "log₁₀(1000) = ?", answer: "3" },
  { question: "cos(0) = ?", answer: "1" },
  { question: "3! = ?", answer: "6" },
  { question: "π rounded to 2 decimals?", answer: "3.14" },
];

const TestYourself = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selected, setSelected] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const initQuestions = useCallback(() => {
    const shuffled = [...questionPool].sort(() => Math.random() - 0.5).slice(0, 10);
    setQuestions(
      shuffled.map((q, i) => ({
        ...q,
        id: i,
        x: 10 + Math.random() * 75,
        y: 10 + Math.random() * 70,
        dx: (Math.random() - 0.5) * 0.3,
        dy: (Math.random() - 0.5) * 0.3,
      }))
    );
    setScore({ correct: 0, total: 0 });
  }, []);

  useEffect(() => {
    initQuestions();
  }, [initQuestions]);

  // Animate bubbles
  useEffect(() => {
    const interval = setInterval(() => {
      setQuestions((prev) =>
        prev.map((q) => {
          let nx = q.x + q.dx;
          let ny = q.y + q.dy;
          let ndx = q.dx;
          let ndy = q.dy;
          if (nx < 2 || nx > 90) ndx = -ndx;
          if (ny < 2 || ny > 85) ndy = -ndy;
          return { ...q, x: nx, y: ny, dx: ndx, dy: ndy };
        })
      );
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = () => {
    if (!selected) return;
    const isCorrect = userAnswer.trim().toLowerCase().replace(/\s/g, "") === selected.answer.toLowerCase().replace(/\s/g, "");
    setResult(isCorrect ? "correct" : "incorrect");
    setScore((s) => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));
    addToHistory({ type: "test", query: selected.question, answer: userAnswer });

    setTimeout(() => {
      setQuestions((prev) => prev.filter((q) => q.id !== selected.id));
      setSelected(null);
      setUserAnswer("");
      setResult(null);
    }, 1500);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground mb-2">Test Yourself</h2>
          <p className="text-muted-foreground font-body">Click the floating bubbles to answer questions</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-display font-bold text-primary">{score.correct}/{score.total}</p>
          <button onClick={initQuestions} className="text-sm text-muted-foreground hover:text-foreground transition-colors font-body">
            Reset
          </button>
        </div>
      </div>

      {/* Bubble arena */}
      <div className="relative h-[500px] rounded-2xl bg-card golden-border elevated-shadow overflow-hidden">
        {questions.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-2xl font-display font-bold text-foreground mb-2">All done! 🎉</p>
              <p className="text-muted-foreground font-body mb-4">Score: {score.correct}/{score.total}</p>
              <button
                onClick={initQuestions}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {questions.map((q) => (
          <motion.button
            key={q.id}
            className="absolute w-16 h-16 rounded-full gold-gradient text-primary-foreground font-bold text-lg flex items-center justify-center hover:scale-110 transition-transform cursor-pointer elevated-shadow"
            style={{ left: `${q.x}%`, top: `${q.y}%` }}
            onClick={() => {
              setSelected(q);
              setUserAnswer("");
              setResult(null);
            }}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.95 }}
          >
            ?
          </motion.button>
        ))}
      </div>

      {/* Question popup */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4"
            onClick={() => { setSelected(null); setResult(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-2xl bg-card elevated-shadow"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-foreground text-lg">Question</h3>
                <button
                  onClick={() => { setSelected(null); setResult(null); }}
                  className="p-1 rounded-lg hover:bg-secondary"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              <p className="text-xl font-body font-medium text-foreground mb-6">{selected.question}</p>

              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-lg mb-4 flex items-center gap-2 ${
                    result === "correct" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                  }`}
                >
                  {result === "correct" ? (
                    <><Check className="h-4 w-4 text-green-600" /><span className="text-green-700 text-sm font-medium">Correct!</span></>
                  ) : (
                    <><X className="h-4 w-4 text-red-600" /><span className="text-red-700 text-sm font-medium">Incorrect. Answer: {selected.answer}</span></>
                  )}
                </motion.div>
              )}

              {!result && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="Your answer..."
                    className="flex-1 px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary transition-colors font-body"
                    autoFocus
                  />
                  <button
                    onClick={handleSubmit}
                    className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm"
                  >
                    Submit
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TestYourself;
