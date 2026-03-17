import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Check, Plus, Trash2, Lightbulb, ChevronRight } from "lucide-react";
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';

interface StepEntry {
  id: number;
  expression: string;
  feedback?: { correct: boolean; message: string };
}

const sampleProblems = [
  { label: "2x + 3 = 7", equation: "2x + 3 = 7", correctSteps: ["2x = 4", "x = 2"] },
  { label: "x² − 5x + 6 = 0", equation: "x² − 5x + 6 = 0", correctSteps: ["(x-2)(x-3) = 0", "x = 2, x = 3"] },
  { label: "3(x − 2) = 12", equation: "3(x − 2) = 12", correctSteps: ["3x − 6 = 12", "3x = 18", "x = 6"] },
];

function analyzeStep(equation: string, stepIndex: number, userStep: string, previousStep: string): { correct: boolean; message: string } {
  const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();
  const step = norm(userStep);
  const prev = norm(previousStep);

  // Check for common errors
  if (prev.includes("2x+3=7")) {
    if (step === "2x=4" || step === "2x=7-3" || step === "2x=7−3") {
      return { correct: true, message: "Correct! You subtracted 3 from both sides." };
    }
    if (step.includes("x=4") || step.includes("x=7-3")) {
      return { correct: false, message: "You subtracted 3 correctly but still need to divide by 2 to isolate x." };
    }
    if (step.includes("x=2")) {
      return { correct: true, message: "You jumped ahead but the answer is correct! Try showing intermediate steps." };
    }
    if (step.includes("2x=10") || step.includes("2x=7+3")) {
      return { correct: false, message: "You should subtract 3, not add it. Moving a term across the equals sign changes its sign." };
    }
  }

  if (prev.includes("2x=4")) {
    if (step === "x=2" || step === "x=4/2") {
      return { correct: true, message: "Correct! Dividing both sides by 2 gives x = 2." };
    }
    if (step === "x=4") {
      return { correct: false, message: "You need to divide both sides by 2, not just drop the coefficient." };
    }
  }

  if (prev.includes("3(x") || prev.includes("3(x−2)=12") || prev.includes("3(x-2)=12")) {
    if (step === "3x-6=12" || step === "3x−6=12") {
      return { correct: true, message: "Correct! You distributed 3 to both terms inside the parentheses." };
    }
    if (step === "x-2=4" || step === "x−2=4") {
      return { correct: true, message: "Correct! You divided both sides by 3." };
    }
    if (step === "3x-2=12" || step === "3x−2=12") {
      return { correct: false, message: "Remember to distribute 3 to both terms: 3·x and 3·(−2). So it should be 3x − 6 = 12." };
    }
  }

  // Generic feedback for quadratics
  if (prev.includes("x²") || prev.includes("x^2")) {
    if (step.includes("(x") && step.includes(")") && step.includes("=0")) {
      return { correct: true, message: "Good factoring! Set each factor equal to zero." };
    }
  }

  // Default: cannot determine
  if (userStep.trim().length > 0) {
    return { correct: true, message: "Step recorded. Continue solving!" };
  }
  return { correct: false, message: "Please enter a valid mathematical step." };
}

const ErrorDetectionTutor = () => {
  const [equation, setEquation] = useState("");
  const [steps, setSteps] = useState<StepEntry[]>([]);
  const [newStep, setNewStep] = useState("");
  const [nextId, setNextId] = useState(0);

  const startProblem = (eq: string) => {
    setEquation(eq);
    setSteps([]);
    setNewStep("");
    setNextId(0);
  };

  const addStep = () => {
    if (!newStep.trim() || !equation) return;
    const previousStep = steps.length > 0 ? steps[steps.length - 1].expression : equation;
    const feedback = analyzeStep(equation, steps.length, newStep, previousStep);
    const entry: StepEntry = { id: nextId, expression: newStep, feedback };
    setSteps(prev => [...prev, entry]);
    setNewStep("");
    setNextId(n => n + 1);
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <div className="mb-6">
        <h2 className="text-3xl font-display font-bold text-foreground mb-2">Step Checker</h2>
        <p className="text-muted-foreground font-body">Enter your solving steps and get instant feedback on mistakes</p>
      </div>

      {/* Problem selection */}
      {!equation && (
        <div className="space-y-4">
          <p className="text-sm font-body text-muted-foreground">Choose a problem or type your own:</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {sampleProblems.map(p => (
              <button
                key={p.label}
                onClick={() => startProblem(p.equation)}
                className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-body hover:bg-primary/10 transition-all"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={equation}
              onChange={(e) => setEquation(e.target.value)}
              placeholder="Or type your own equation..."
              className="flex-1 px-4 py-3 rounded-xl bg-card golden-border text-foreground placeholder:text-muted-foreground outline-none font-body"
            />
            <button
              onClick={() => equation && startProblem(equation)}
              className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm"
            >
              Start
            </button>
          </div>
        </div>
      )}

      {/* Active problem */}
      {equation && (
        <div className="space-y-4">
          {/* Problem display */}
          <div className="p-5 rounded-xl bg-card golden-border elevated-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-body uppercase tracking-wider mb-1">Problem</p>
                <p className="text-xl font-display font-bold text-foreground">{equation}</p>
              </div>
              <button
                onClick={() => { setEquation(""); setSteps([]); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors font-body"
              >
                Change
              </button>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            <AnimatePresence>
              {steps.map((step, i) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 rounded-xl bg-card golden-border card-shadow"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                      step.feedback?.correct ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"
                    }`}>
                      {step.feedback?.correct ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    </span>
                    <p className="font-body font-medium text-foreground">Step {i + 1}: {step.expression}</p>
                  </div>
                  {step.feedback && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`ml-10 text-sm font-body ${step.feedback.correct ? "text-green-600" : "text-destructive"}`}
                    >
                      {step.feedback.message}
                    </motion.p>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Add step input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newStep}
              onChange={(e) => setNewStep(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addStep()}
              placeholder={`Step ${steps.length + 1}: Enter your next step...`}
              className="flex-1 px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-primary transition-colors font-body"
              autoFocus
            />
            <button onClick={addStep} className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Step
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ErrorDetectionTutor;
