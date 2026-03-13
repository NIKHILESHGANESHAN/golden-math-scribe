import { useState } from "react";
import { motion } from "framer-motion";
import { Check, HelpCircle, ChevronRight } from "lucide-react";
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface Step {
  title: string;
  explanation: string;
  formula?: string;
}

function renderMathText(text: string) {
  // Split text on LaTeX-like patterns and render inline math
  // Detect patterns like \frac{}{}, x^2, \sqrt{}, etc.
  const parts = text.split(/(\$[^$]+\$)/g);
  return parts.map((part, i) => {
    if (part.startsWith('$') && part.endsWith('$')) {
      const latex = part.slice(1, -1);
      try {
        return <InlineMath key={i} math={latex} />;
      } catch {
        return <span key={i}>{latex}</span>;
      }
    }
    return <span key={i}>{part}</span>;
  });
}

const StepSolution = ({
  steps,
  answer,
  practiceMode,
  formula,
}: {
  steps: Step[];
  answer: string;
  practiceMode: boolean;
  formula?: string;
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "hint" | null>(null);
  const [completed, setCompleted] = useState(false);

  const handleSubmit = () => {
    if (userAnswer.trim().length > 0) {
      setFeedback("correct");
      setTimeout(() => {
        if (currentStep < steps.length - 1) {
          setCurrentStep((s) => s + 1);
          setUserAnswer("");
          setFeedback(null);
        } else {
          setCompleted(true);
        }
      }, 1000);
    }
  };

  const showHint = () => setFeedback("hint");

  if (!practiceMode) {
    return (
      <div className="space-y-4">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15 }}
            className="p-5 rounded-xl bg-card golden-border card-shadow"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold">
                {i + 1}
              </span>
              <h3 className="font-display font-semibold text-foreground">{step.title}</h3>
            </div>
            <div className="text-muted-foreground font-body ml-10 whitespace-pre-line">
              {renderMathText(step.explanation)}
            </div>
            {step.formula && (
              <div className="ml-10 mt-3 p-3 rounded-lg bg-secondary/50 overflow-x-auto">
                <FormulaRenderer math={step.formula} />
              </div>
            )}
          </motion.div>
        ))}

        {/* Formula display */}
        {formula && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: steps.length * 0.1 }}
            className="p-5 rounded-xl bg-card golden-border card-shadow"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-accent/20 text-accent-foreground text-sm font-bold">
                ƒ
              </span>
              <h3 className="font-display font-semibold text-foreground">Formula Used</h3>
            </div>
            <div className="ml-10 p-3 rounded-lg bg-secondary/50 overflow-x-auto">
              <FormulaRenderer math={formula} />
            </div>
          </motion.div>
        )}

        {/* Final answer */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: steps.length * 0.15 }}
          className="p-6 rounded-xl gold-gradient text-primary-foreground"
        >
          <p className="text-sm font-medium opacity-80 mb-1">Final Answer</p>
          <p className="text-2xl font-display font-bold whitespace-pre-line">{answer}</p>
        </motion.div>
      </div>
    );
  }

  // Practice mode
  if (completed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6 rounded-xl gold-gradient text-primary-foreground text-center"
      >
        <Check className="h-12 w-12 mx-auto mb-3 opacity-80" />
        <p className="text-sm font-medium opacity-80 mb-1">Excellent! Final Answer</p>
        <p className="text-2xl font-display font-bold">{answer}</p>
      </motion.div>
    );
  }

  const step = steps[currentStep];

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex gap-2">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              i < currentStep ? "bg-primary" : i === currentStep ? "bg-primary/50" : "bg-secondary"
            }`}
          />
        ))}
      </div>

      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="p-6 rounded-xl bg-card golden-border elevated-shadow"
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold">
            {currentStep + 1}
          </span>
          <h3 className="font-display font-semibold text-foreground">{step.title}</h3>
        </div>

        <div className="text-muted-foreground mb-4 font-body whitespace-pre-line">
          {renderMathText(step.explanation)}
        </div>

        {feedback === "hint" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-primary/5 border border-primary/10 mb-4"
          >
            <p className="text-sm text-primary flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Try breaking the problem into smaller parts. Look at the key relationship described above.
            </p>
          </motion.div>
        )}

        {feedback === "correct" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 rounded-lg bg-green-50 border border-green-200 mb-4 flex items-center gap-2"
          >
            <Check className="h-4 w-4 text-green-600" />
            <p className="text-sm text-green-700 font-medium">Correct! Moving on...</p>
          </motion.div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Your answer..."
            className="flex-1 px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary transition-colors font-body"
          />
          <button
            onClick={handleSubmit}
            className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            Submit <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={showHint}
            className="px-4 py-3 rounded-xl bg-secondary text-secondary-foreground text-sm hover:bg-primary/10 transition-colors"
          >
            Hint
          </button>
        </div>
      </motion.div>
    </div>
  );
};

function FormulaRenderer({ math: latex }: { math: string }) {
  try {
    return <BlockMath math={latex} />;
  } catch {
    return <code className="text-sm">{latex}</code>;
  }
}

export default StepSolution;
