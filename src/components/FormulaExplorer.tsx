import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, ChevronRight } from "lucide-react";

interface Formula {
  name: string;
  formula: string;
  explanation: string;
  example: string;
}

const categories: Record<string, Formula[]> = {
  Algebra: [
    { name: "Quadratic Formula", formula: "x = (−b ± √(b²−4ac)) / 2a", explanation: "Solves any quadratic equation ax² + bx + c = 0", example: "x² − 5x + 6 = 0" },
    { name: "Difference of Squares", formula: "a² − b² = (a+b)(a−b)", explanation: "Factoring technique for difference of two perfect squares", example: "x² − 9 = (x+3)(x−3)" },
    { name: "Binomial Theorem", formula: "(a+b)ⁿ = Σ C(n,k) aⁿ⁻ᵏbᵏ", explanation: "Expands powers of binomials", example: "(x+1)³ = x³ + 3x² + 3x + 1" },
  ],
  Calculus: [
    { name: "Power Rule", formula: "d/dx(xⁿ) = nxⁿ⁻¹", explanation: "Derivative of x raised to a power", example: "d/dx(x³) = 3x²" },
    { name: "Chain Rule", formula: "d/dx[f(g(x))] = f'(g(x))·g'(x)", explanation: "Derivative of composed functions", example: "d/dx[sin(x²)] = cos(x²)·2x" },
    { name: "Integration by Parts", formula: "∫u dv = uv − ∫v du", explanation: "Technique for integrating products", example: "∫x·eˣ dx = x·eˣ − eˣ + C" },
  ],
  Trigonometry: [
    { name: "Pythagorean Identity", formula: "sin²θ + cos²θ = 1", explanation: "Fundamental trig identity", example: "If sinθ = 3/5, cosθ = 4/5" },
    { name: "Law of Cosines", formula: "c² = a² + b² − 2ab·cosC", explanation: "Relates sides and angles in any triangle", example: "a=3, b=4, C=60°" },
    { name: "Double Angle", formula: "sin(2θ) = 2sinθcosθ", explanation: "Express trig of double angle", example: "sin(60°) = 2sin(30°)cos(30°)" },
  ],
  Geometry: [
    { name: "Area of Circle", formula: "A = πr²", explanation: "Area enclosed by a circle of radius r", example: "r = 5 → A = 25π" },
    { name: "Volume of Sphere", formula: "V = (4/3)πr³", explanation: "Volume of a sphere of radius r", example: "r = 3 → V = 36π" },
    { name: "Distance Formula", formula: "d = √((x₂−x₁)² + (y₂−y₁)²)", explanation: "Distance between two points", example: "(0,0) to (3,4) → d = 5" },
  ],
  Statistics: [
    { name: "Mean", formula: "x̄ = (Σxᵢ) / n", explanation: "Average of a data set", example: "{2,4,6} → x̄ = 4" },
    { name: "Standard Deviation", formula: "σ = √(Σ(xᵢ−x̄)²/n)", explanation: "Measure of data spread", example: "Measures how spread out values are" },
    { name: "Normal Distribution", formula: "f(x) = (1/σ√2π)e^(-(x-μ)²/2σ²)", explanation: "Bell curve probability distribution", example: "68% of data within 1σ of mean" },
  ],
};

const categoryList = Object.keys(categories);

const FormulaExplorer = () => {
  const [activeCategory, setActiveCategory] = useState(categoryList[0]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <div className="mb-6">
        <h2 className="text-3xl font-display font-bold text-foreground mb-2">Formula Explorer</h2>
        <p className="text-muted-foreground font-body">Browse essential formulas by category</p>
      </div>

      {/* Category tabs */}
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

      {/* Formula cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories[activeCategory].map((f, i) => (
          <motion.div
            key={f.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-5 rounded-xl bg-card golden-border card-shadow hover:elevated-shadow transition-shadow group"
          >
            <div className="flex items-start gap-3 mb-3">
              <BookOpen className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <h3 className="font-display font-semibold text-foreground">{f.name}</h3>
            </div>
            <p className="text-lg font-body font-semibold text-primary mb-2 break-all">{f.formula}</p>
            <p className="text-sm text-muted-foreground font-body mb-3">{f.explanation}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-body">
              <span className="px-2 py-1 rounded-md bg-secondary">Example: {f.example}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default FormulaExplorer;
