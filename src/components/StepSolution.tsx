import { useState } from "react";
import { motion } from "framer-motion";
import { Check, HelpCircle, ChevronRight, Award, BookOpen, FlaskConical, Calculator, Target, Lightbulb, BarChart3, TrendingUp } from "lucide-react";
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import type { FormattedStep, ContentBlock } from "@/lib/solutionFormatter";

interface Step {
  title: string;
  content?: ContentBlock[];
  // Legacy compat
  explanation?: string;
  formula?: string;
  type?: string;
}

function renderContentBlock(block: ContentBlock, i: number) {
  switch (block.kind) {
    case "text":
      return <p key={i} className="text-muted-foreground leading-relaxed">{renderInlineLatex(block.value)}</p>;
    case "latex":
      try { return <span key={i}><InlineMath math={block.value} /></span>; }
      catch { return <code key={i} className="text-sm">{block.value}</code>; }
    case "latex-block":
      try { return <div key={i} className="my-3 p-3 rounded-lg bg-secondary/40 overflow-x-auto"><BlockMath math={block.value} /></div>; }
      catch { return <pre key={i} className="text-sm p-3 bg-secondary/40 rounded-lg overflow-x-auto">{block.value}</pre>; }
    case "highlight":
      return (
        <div key={i} className="my-3 p-3 rounded-lg bg-primary/10 border border-primary/20 font-semibold text-foreground">
          {renderInlineLatex(block.value)}
        </div>
      );
    default:
      return <span key={i}>{block.value}</span>;
  }
}

function renderInlineLatex(text: string) {
  const parts = text.split(/(\$[^$]+\$)/g);
  return parts.map((part, i) => {
    if (part.startsWith('$') && part.endsWith('$')) {
      const latex = part.slice(1, -1);
      try { return <InlineMath key={i} math={latex} />; }
      catch { return <span key={i}>{latex}</span>; }
    }
    return <span key={i}>{part}</span>;
  });
}

function stepIcon(type?: string) {
  switch (type) {
    case "interpretation": return <BookOpen className="h-4 w-4" />;
    case "hypothesis": return <Target className="h-4 w-4" />;
    case "values": return <FlaskConical className="h-4 w-4" />;
    case "formula": return <Calculator className="h-4 w-4" />;
    case "computation": return <TrendingUp className="h-4 w-4" />;
    case "substitution": return <Calculator className="h-4 w-4" />;
    case "pvalue": return <BarChart3 className="h-4 w-4" />;
    case "conclusion": return <Lightbulb className="h-4 w-4" />;
    default: return null;
  }
}

function stepAccentClass(type?: string): string {
  switch (type) {
    case "interpretation": return "border-l-4 border-l-primary/40";
    case "hypothesis": return "border-l-4 border-l-accent/60";
    case "values": return "border-l-4 border-l-muted-foreground/30";
    case "formula": return "border-l-4 border-l-primary/60";
    case "computation": return "border-l-4 border-l-primary/30";
    case "pvalue": return "border-l-4 border-l-accent/50";
    case "conclusion": return "border-l-4 border-l-primary/50";
    default: return "";
  }
}

function renderStepContent(step: Step) {
  // New format: content blocks
  if (step.content && step.content.length > 0) {
    return (
      <div className="ml-11 space-y-1">
        {step.content.map((block, i) => renderContentBlock(block, i))}
      </div>
    );
  }
  // Legacy format fallback
  return (
    <div className="ml-11 space-y-2">
      {step.explanation && (
        <div className="text-muted-foreground whitespace-pre-line leading-relaxed">
          {renderInlineLatex(step.explanation)}
        </div>
      )}
      {step.formula && (
        <div className="mt-3 p-4 rounded-lg bg-secondary/50 overflow-x-auto">
          <FormulaRenderer math={step.formula} />
        </div>
      )}
    </div>
  );
}

const StepSolution = ({
  steps, answer, answerFormula, practiceMode, formula,
}: {
  steps: Step[];
  answer: string;
  answerFormula?: string;
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
        {/* ── Final Answer ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 rounded-2xl gold-gradient text-primary-foreground relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-5 w-5 opacity-80" />
              <p className="text-sm font-semibold uppercase tracking-wider opacity-80">Final Answer</p>
            </div>
            {answerFormula ? (
              <div className="text-2xl font-display font-bold">
                <FormulaRenderer math={answerFormula} />
              </div>
            ) : (
              <p className="text-2xl font-display font-bold whitespace-pre-line leading-relaxed">
                {renderInlineLatex(answer)}
              </p>
            )}
          </div>
        </motion.div>

        {/* ── Worked Solution Steps ───────────────────────────── */}
        <div className="space-y-3">
          {steps.map((step, i) => {
            const isConclusion = step.type === "conclusion";
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className={`p-5 rounded-xl bg-card golden-border card-shadow ${stepAccentClass(step.type)}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                    isConclusion
                      ? "bg-primary/20 text-primary"
                      : "bg-secondary text-muted-foreground"
                  }`}>
                    {stepIcon(step.type) || (i + 1)}
                  </span>
                  <h3 className="font-display font-semibold text-foreground text-sm uppercase tracking-wide">
                    {step.title}
                  </h3>
                </div>
                {renderStepContent(step)}
              </motion.div>
            );
          })}
        </div>
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
        <p className="text-2xl font-display font-bold">{renderInlineLatex(answer)}</p>
      </motion.div>
    );
  }

  const step = steps[currentStep];
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {steps.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${
            i < currentStep ? "bg-primary" : i === currentStep ? "bg-primary/50" : "bg-secondary"
          }`} />
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
        {renderStepContent(step)}

        {feedback === "hint" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg bg-primary/5 border border-primary/10 mb-4 mt-4">
            <p className="text-sm text-primary flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Try breaking the problem into smaller parts. Look at the key relationship described above.
            </p>
          </motion.div>
        )}
        {feedback === "correct" && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-3 rounded-lg bg-primary/5 border border-primary/20 mb-4 mt-4 flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            <p className="text-sm text-primary font-medium">Correct! Moving on...</p>
          </motion.div>
        )}

        <div className="flex gap-2 mt-4">
          <input
            type="text" value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Your answer..."
            className="flex-1 px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary transition-colors font-body"
          />
          <button onClick={handleSubmit} className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity flex items-center gap-2">
            Submit <ChevronRight className="h-4 w-4" />
          </button>
          <button onClick={showHint} className="px-4 py-3 rounded-xl bg-secondary text-secondary-foreground text-sm hover:bg-primary/10 transition-colors">
            Hint
          </button>
        </div>
      </motion.div>
    </div>
  );
};

function FormulaRenderer({ math: latex }: { math: string }) {
  try { return <BlockMath math={latex} />; }
  catch { return <code className="text-sm">{latex}</code>; }
}

export default StepSolution;
