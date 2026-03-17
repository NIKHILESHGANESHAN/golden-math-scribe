import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ChevronRight, Search } from "lucide-react";
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface Formula {
  name: string;
  formula: string;
  latex: string;
  explanation: string;
  example: string;
}

const categories: Record<string, Formula[]> = {
  "Basic Math": [
    { name: "Percentage", formula: "P = (Part/Whole) × 100", latex: "P = \\frac{\\text{Part}}{\\text{Whole}} \\times 100", explanation: "Calculates the percentage a part represents of a whole", example: "25 out of 200 → (25/200)×100 = 12.5%" },
    { name: "Ratio & Proportion", formula: "a/b = c/d → ad = bc", latex: "\\frac{a}{b} = \\frac{c}{d} \\implies ad = bc", explanation: "Cross-multiplication to solve proportions", example: "2/3 = x/9 → x = 6" },
    { name: "Simple Interest", formula: "I = PRT", latex: "I = P \\cdot r \\cdot t", explanation: "Interest earned on principal P at rate r for time t", example: "P=1000, r=5%, t=3 → I=150" },
    { name: "Compound Interest", formula: "A = P(1 + r/n)^(nt)", latex: "A = P\\left(1 + \\frac{r}{n}\\right)^{nt}", explanation: "Amount with interest compounded n times per period", example: "P=1000, r=5%, n=12, t=1" },
  ],
  Algebra: [
    { name: "Quadratic Formula", formula: "x = (−b ± √(b²−4ac)) / 2a", latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}", explanation: "Solves any quadratic equation ax² + bx + c = 0", example: "x² − 5x + 6 = 0 → x = 2, 3" },
    { name: "Difference of Squares", formula: "a² − b² = (a+b)(a−b)", latex: "a^2 - b^2 = (a+b)(a-b)", explanation: "Factoring technique for difference of two perfect squares", example: "x² − 9 = (x+3)(x−3)" },
    { name: "Binomial Theorem", formula: "(a+b)ⁿ = Σ C(n,k) aⁿ⁻ᵏbᵏ", latex: "(a+b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^k", explanation: "Expands powers of binomials", example: "(x+1)³ = x³ + 3x² + 3x + 1" },
    { name: "Sum of Squares", formula: "a² + 2ab + b² = (a+b)²", latex: "a^2 + 2ab + b^2 = (a+b)^2", explanation: "Perfect square trinomial", example: "x² + 6x + 9 = (x+3)²" },
    { name: "Logarithm Rules", formula: "log(ab) = log(a) + log(b)", latex: "\\log(ab) = \\log a + \\log b", explanation: "Product rule for logarithms", example: "log(6) = log(2) + log(3)" },
    { name: "Change of Base", formula: "logₐ(b) = ln(b)/ln(a)", latex: "\\log_a b = \\frac{\\ln b}{\\ln a}", explanation: "Convert between logarithm bases", example: "log₂(8) = ln(8)/ln(2) = 3" },
  ],
  Calculus: [
    { name: "Power Rule", formula: "d/dx(xⁿ) = nxⁿ⁻¹", latex: "\\frac{d}{dx}x^n = nx^{n-1}", explanation: "Derivative of x raised to a power", example: "d/dx(x³) = 3x²" },
    { name: "Chain Rule", formula: "d/dx[f(g(x))] = f'(g(x))·g'(x)", latex: "\\frac{d}{dx}[f(g(x))] = f'(g(x)) \\cdot g'(x)", explanation: "Derivative of composed functions", example: "d/dx[sin(x²)] = cos(x²)·2x" },
    { name: "Product Rule", formula: "(fg)' = f'g + fg'", latex: "(fg)' = f'g + fg'", explanation: "Derivative of a product of two functions", example: "d/dx[x·sin(x)] = sin(x) + x·cos(x)" },
    { name: "Quotient Rule", formula: "(f/g)' = (f'g − fg') / g²", latex: "\\left(\\frac{f}{g}\\right)' = \\frac{f'g - fg'}{g^2}", explanation: "Derivative of a quotient", example: "d/dx[sin(x)/x]" },
    { name: "Integration by Parts", formula: "∫u dv = uv − ∫v du", latex: "\\int u\\, dv = uv - \\int v\\, du", explanation: "Technique for integrating products", example: "∫x·eˣ dx = x·eˣ − eˣ + C" },
    { name: "Fundamental Theorem", formula: "∫ₐᵇ f(x)dx = F(b) − F(a)", latex: "\\int_a^b f(x)\\,dx = F(b) - F(a)", explanation: "Connects differentiation and integration", example: "∫₀¹ x² dx = 1/3" },
    { name: "Taylor Series", formula: "f(x) = Σ f⁽ⁿ⁾(a)/n! (x−a)ⁿ", latex: "f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!}(x-a)^n", explanation: "Represents a function as an infinite polynomial", example: "eˣ = 1 + x + x²/2! + ..." },
    { name: "L'Hôpital's Rule", formula: "lim f/g = lim f'/g'", latex: "\\lim_{x\\to a}\\frac{f(x)}{g(x)} = \\lim_{x\\to a}\\frac{f'(x)}{g'(x)}", explanation: "Evaluates indeterminate forms 0/0 or ∞/∞", example: "lim(sin x/x) as x→0 = 1" },
  ],
  Trigonometry: [
    { name: "Pythagorean Identity", formula: "sin²θ + cos²θ = 1", latex: "\\sin^2\\theta + \\cos^2\\theta = 1", explanation: "Fundamental trig identity", example: "If sinθ = 3/5, cosθ = 4/5" },
    { name: "Law of Cosines", formula: "c² = a² + b² − 2ab·cosC", latex: "c^2 = a^2 + b^2 - 2ab\\cos C", explanation: "Relates sides and angles in any triangle", example: "a=3, b=4, C=60°" },
    { name: "Law of Sines", formula: "a/sinA = b/sinB = c/sinC", latex: "\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C}", explanation: "Relates sides to opposite angles", example: "Solve oblique triangles" },
    { name: "Double Angle (sin)", formula: "sin(2θ) = 2sinθcosθ", latex: "\\sin(2\\theta) = 2\\sin\\theta\\cos\\theta", explanation: "Express sine of double angle", example: "sin(60°) = 2sin(30°)cos(30°)" },
    { name: "Double Angle (cos)", formula: "cos(2θ) = cos²θ − sin²θ", latex: "\\cos(2\\theta) = \\cos^2\\theta - \\sin^2\\theta", explanation: "Express cosine of double angle", example: "cos(60°) = 2cos²(30°) − 1" },
    { name: "Angle Addition", formula: "sin(A+B) = sinAcosB + cosAsinB", latex: "\\sin(A+B) = \\sin A\\cos B + \\cos A\\sin B", explanation: "Sine of sum of two angles", example: "sin(75°) = sin(45°+30°)" },
  ],
  Geometry: [
    { name: "Area of Circle", formula: "A = πr²", latex: "A = \\pi r^2", explanation: "Area enclosed by a circle of radius r", example: "r = 5 → A = 25π" },
    { name: "Volume of Sphere", formula: "V = (4/3)πr³", latex: "V = \\frac{4}{3}\\pi r^3", explanation: "Volume of a sphere of radius r", example: "r = 3 → V = 36π" },
    { name: "Distance Formula", formula: "d = √((x₂−x₁)² + (y₂−y₁)²)", latex: "d = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}", explanation: "Distance between two points", example: "(0,0) to (3,4) → d = 5" },
    { name: "Volume of Cylinder", formula: "V = πr²h", latex: "V = \\pi r^2 h", explanation: "Volume of a cylinder", example: "r=3, h=5 → V = 45π" },
    { name: "Surface Area of Sphere", formula: "SA = 4πr²", latex: "SA = 4\\pi r^2", explanation: "Total surface area of a sphere", example: "r = 2 → SA = 16π" },
    { name: "Midpoint Formula", formula: "M = ((x₁+x₂)/2, (y₁+y₂)/2)", latex: "M = \\left(\\frac{x_1+x_2}{2}, \\frac{y_1+y_2}{2}\\right)", explanation: "Midpoint between two points", example: "(2,4) and (6,8) → M=(4,6)" },
  ],
  Statistics: [
    { name: "Mean", formula: "x̄ = (Σxᵢ) / n", latex: "\\bar{x} = \\frac{\\sum x_i}{n}", explanation: "Average of a data set", example: "{2,4,6} → x̄ = 4" },
    { name: "Variance", formula: "σ² = Σ(xᵢ−x̄)²/n", latex: "\\sigma^2 = \\frac{\\sum (x_i - \\bar{x})^2}{n}", explanation: "Measure of data spread (squared)", example: "Avg of squared deviations" },
    { name: "Standard Deviation", formula: "σ = √(Σ(xᵢ−x̄)²/n)", latex: "\\sigma = \\sqrt{\\frac{\\sum (x_i - \\bar{x})^2}{n}}", explanation: "Square root of variance", example: "Measures how spread out values are" },
    { name: "Z-Score", formula: "Z = (x − μ) / σ", latex: "Z = \\frac{x - \\mu}{\\sigma}", explanation: "Number of standard deviations from mean", example: "x=85, μ=80, σ=5 → Z=1" },
    { name: "Z-Test Statistic", formula: "Z = (x̄ − μ) / (σ/√n)", latex: "Z = \\frac{\\bar{x} - \\mu}{\\sigma / \\sqrt{n}}", explanation: "Test statistic for population mean", example: "Compare sample to population" },
    { name: "Normal Distribution", formula: "f(x) = (1/σ√2π)e^(−(x−μ)²/2σ²)", latex: "f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}", explanation: "Bell curve probability distribution", example: "68% within 1σ of mean" },
    { name: "Confidence Interval", formula: "x̄ ± Z*(σ/√n)", latex: "\\bar{x} \\pm Z_{\\alpha/2} \\cdot \\frac{\\sigma}{\\sqrt{n}}", explanation: "Range likely to contain the population parameter", example: "95% CI uses Z=1.96" },
  ],
  Probability: [
    { name: "Conditional Probability", formula: "P(A|B) = P(A∩B) / P(B)", latex: "P(A|B) = \\frac{P(A \\cap B)}{P(B)}", explanation: "Probability of A given B has occurred", example: "P(Rain|Cloudy)" },
    { name: "Bayes' Theorem", formula: "P(A|B) = P(B|A)P(A) / P(B)", latex: "P(A|B) = \\frac{P(B|A) \\cdot P(A)}{P(B)}", explanation: "Updates probability with new evidence", example: "Medical test accuracy" },
    { name: "Binomial Distribution", formula: "P(X=k) = C(n,k)pᵏ(1−p)ⁿ⁻ᵏ", latex: "P(X=k) = \\binom{n}{k} p^k (1-p)^{n-k}", explanation: "Probability of k successes in n trials", example: "Coin flips, defect rates" },
    { name: "Expected Value", formula: "E[X] = Σ xᵢP(xᵢ)", latex: "E[X] = \\sum x_i P(x_i)", explanation: "Long-run average value", example: "E[die] = 3.5" },
    { name: "Poisson Distribution", formula: "P(X=k) = e⁻λλᵏ/k!", latex: "P(X=k) = \\frac{e^{-\\lambda} \\lambda^k}{k!}", explanation: "Probability of k events in fixed interval", example: "λ=3 calls/hour" },
  ],
  "Linear Algebra": [
    { name: "Matrix Multiplication", formula: "(AB)ᵢⱼ = Σ aᵢₖbₖⱼ", latex: "(AB)_{ij} = \\sum_k a_{ik} b_{kj}", explanation: "Element-wise computation of matrix product", example: "2×2 matrix product" },
    { name: "Determinant (2×2)", formula: "det(A) = ad − bc", latex: "\\det\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix} = ad - bc", explanation: "Determinant of a 2×2 matrix", example: "det[[2,1],[3,4]] = 5" },
    { name: "Eigenvalue Equation", formula: "Av = λv", latex: "A\\mathbf{v} = \\lambda\\mathbf{v}", explanation: "Defines eigenvalues and eigenvectors", example: "det(A − λI) = 0" },
    { name: "Inverse (2×2)", formula: "A⁻¹ = (1/det)[[d,−b],[−c,a]]", latex: "A^{-1} = \\frac{1}{ad-bc}\\begin{pmatrix}d&-b\\\\-c&a\\end{pmatrix}", explanation: "Inverse of a 2×2 matrix", example: "A·A⁻¹ = I" },
    { name: "Dot Product", formula: "a·b = Σ aᵢbᵢ", latex: "\\mathbf{a} \\cdot \\mathbf{b} = \\sum a_i b_i", explanation: "Scalar product of two vectors", example: "[1,2]·[3,4] = 11" },
  ],
  "Diff. Equations": [
    { name: "Separable ODE", formula: "dy/dx = f(x)g(y)", latex: "\\frac{dy}{dx} = f(x)g(y) \\implies \\int \\frac{dy}{g(y)} = \\int f(x)\\,dx", explanation: "Separate variables and integrate both sides", example: "dy/dx = xy → ln|y| = x²/2 + C" },
    { name: "Linear First-Order", formula: "dy/dx + P(x)y = Q(x)", latex: "\\frac{dy}{dx} + P(x)y = Q(x)", explanation: "Use integrating factor μ = e^(∫P dx)", example: "y' + 2y = e⁻ˣ" },
    { name: "Characteristic Equation", formula: "ar² + br + c = 0", latex: "ar^2 + br + c = 0", explanation: "Solve constant-coefficient 2nd order ODEs", example: "y'' + 3y' + 2y = 0" },
  ],
  Optimization: [
    { name: "Gradient Descent", formula: "θ = θ − α∇f(θ)", latex: "\\theta_{n+1} = \\theta_n - \\alpha \\nabla f(\\theta_n)", explanation: "Iterative optimization algorithm", example: "Learning rate α = 0.01" },
    { name: "Lagrange Multipliers", formula: "∇f = λ∇g", latex: "\\nabla f = \\lambda \\nabla g", explanation: "Optimize f subject to constraint g=0", example: "Maximize f(x,y) subject to g(x,y)=0" },
    { name: "Critical Points", formula: "f'(x) = 0", latex: "f'(x) = 0", explanation: "Find maxima, minima, and saddle points", example: "f(x) = x³ − 3x → x = ±1" },
  ],
  "Advanced Math": [
    { name: "Fourier Transform", formula: "F(ω) = ∫f(t)e^(−iωt)dt", latex: "F(\\omega) = \\int_{-\\infty}^{\\infty} f(t) e^{-i\\omega t}\\,dt", explanation: "Decomposes signal into frequency components", example: "Signal processing" },
    { name: "Laplace Transform", formula: "L{f(t)} = ∫₀^∞ f(t)e^(−st)dt", latex: "\\mathcal{L}\\{f(t)\\} = \\int_0^{\\infty} f(t) e^{-st}\\,dt", explanation: "Converts differential equations to algebraic", example: "L{eᵃᵗ} = 1/(s−a)" },
    { name: "Euler's Formula", formula: "e^(iθ) = cosθ + i·sinθ", latex: "e^{i\\theta} = \\cos\\theta + i\\sin\\theta", explanation: "Connects exponential and trigonometric functions", example: "e^(iπ) + 1 = 0" },
    { name: "Complex Modulus", formula: "|z| = √(a² + b²)", latex: "|z| = \\sqrt{a^2 + b^2}", explanation: "Magnitude of complex number z = a + bi", example: "|3 + 4i| = 5" },
  ],
};

const categoryList = Object.keys(categories);

const FormulaExplorer = () => {
  const [activeCategory, setActiveCategory] = useState(categoryList[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFormula, setExpandedFormula] = useState<string | null>(null);

  const filteredFormulas = searchQuery.trim()
    ? Object.values(categories).flat().filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.explanation.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : categories[activeCategory];

  return (
    <div className="w-full max-w-5xl mx-auto px-4">
      <div className="mb-6">
        <h2 className="text-3xl font-display font-bold text-foreground mb-2">Formula Explorer</h2>
        <p className="text-muted-foreground font-body">Comprehensive mathematics formula library with {Object.values(categories).flat().length}+ formulas</p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 rounded-xl bg-card golden-border card-shadow px-4 py-3 mb-6">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search formulas..."
          className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm font-body"
        />
      </div>

      {/* Category tabs */}
      {!searchQuery && (
        <div className="flex flex-wrap gap-2 mb-8">
          {categoryList.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium font-body transition-all ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-primary/10"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {searchQuery && (
        <p className="text-sm text-muted-foreground mb-4 font-body">
          Found {filteredFormulas.length} formula{filteredFormulas.length !== 1 ? 's' : ''} matching "{searchQuery}"
        </p>
      )}

      {/* Formula cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filteredFormulas.map((f, i) => {
            const isExpanded = expandedFormula === f.name;
            return (
              <motion.div
                key={f.name}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setExpandedFormula(isExpanded ? null : f.name)}
                className={`p-5 rounded-xl bg-card golden-border card-shadow hover:elevated-shadow transition-shadow cursor-pointer group ${isExpanded ? 'md:col-span-2 lg:col-span-2' : ''}`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <BookOpen className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <h3 className="font-display font-semibold text-foreground">{f.name}</h3>
                  <ChevronRight className={`h-4 w-4 text-muted-foreground ml-auto transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>

                {/* KaTeX rendered formula */}
                <div className="mb-3 overflow-x-auto">
                  <SafeBlockMath math={f.latex} />
                </div>

                <p className="text-sm text-muted-foreground font-body mb-3">{f.explanation}</p>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-border pt-3 mt-3"
                    >
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-body">
                        <span className="px-2 py-1 rounded-md bg-secondary">Example: {f.example}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!isExpanded && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-body">
                    <span className="px-2 py-1 rounded-md bg-secondary">Example: {f.example}</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Simple error boundary wrapper for KaTeX
function try_({ children }: { children: React.ReactNode }) {
  try { return <>{children}</>; }
  catch { return null; }
}

export default FormulaExplorer;
