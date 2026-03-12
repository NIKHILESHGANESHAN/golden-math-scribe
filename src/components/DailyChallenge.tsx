import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy, Check, X } from "lucide-react";

const challenges = [
  { question: "Solve: 2x + 5 = 17", answer: "6", hint: "Subtract 5 from both sides, then divide by 2" },
  { question: "Find the derivative of f(x) = 3x⁴", answer: "12x³", hint: "Apply the power rule: d/dx(xⁿ) = nxⁿ⁻¹" },
  { question: "What is ∫4x dx?", answer: "2x²+C", hint: "Use the power rule for integration" },
  { question: "Simplify: √(48)", answer: "4√3", hint: "Factor 48 = 16 × 3, then √16 = 4" },
  { question: "If sin(θ) = 0.5, what is θ in degrees?", answer: "30", hint: "Think about the unit circle" },
  { question: "What is log₂(64)?", answer: "6", hint: "2 raised to what power equals 64?" },
  { question: "Solve: x² = 81", answer: "9", hint: "Take the square root of both sides (positive root)" },
];

const DailyChallenge = () => {
  const challenge = useMemo(() => {
    const dayIndex = Math.floor(Date.now() / 86400000) % challenges.length;
    return challenges[dayIndex];
  }, []);

  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);
  const [showHint, setShowHint] = useState(false);

  const handleSubmit = () => {
    const clean = (s: string) => s.toLowerCase().replace(/\s/g, "");
    setResult(clean(answer) === clean(challenge.answer) ? "correct" : "incorrect");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto p-6 rounded-2xl bg-card golden-border elevated-shadow"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center">
          <Trophy className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-foreground">Daily Challenge</h3>
          <p className="text-xs text-muted-foreground font-body">A new problem every day</p>
        </div>
      </div>

      <p className="text-lg font-body font-medium text-foreground mb-4">{challenge.question}</p>

      {showHint && !result && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-primary bg-primary/5 px-3 py-2 rounded-lg mb-4 font-body"
        >
          💡 {challenge.hint}
        </motion.p>
      )}

      {result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${
            result === "correct" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
          }`}
        >
          {result === "correct" ? (
            <><Check className="h-4 w-4 text-green-600" /><span className="text-green-700 text-sm font-medium font-body">Correct! Well done!</span></>
          ) : (
            <><X className="h-4 w-4 text-red-600" /><span className="text-red-700 text-sm font-medium font-body">Answer: {challenge.answer}</span></>
          )}
        </motion.div>
      )}

      {!result && (
        <div className="space-y-3">
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Your answer..."
            className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary transition-colors font-body"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm"
            >
              Submit
            </button>
            <button
              onClick={() => setShowHint(true)}
              className="px-4 py-3 rounded-xl bg-secondary text-secondary-foreground text-sm"
            >
              Hint
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default DailyChallenge;
