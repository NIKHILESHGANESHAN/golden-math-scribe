import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Keyboard } from "lucide-react";
import MathKeyboard from "./MathKeyboard";
import * as math from "mathjs";

const presets = ["x^2", "sin(x)", "x^3 - 2*x", "cos(x)", "log(x)", "sqrt(x)"];

const GraphVisualizer = () => {
  const [expr, setExpr] = useState("x^2");
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [xRange, setXRange] = useState<[number, number]>([-10, 10]);

  const points = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    const step = (xRange[1] - xRange[0]) / 400;
    for (let x = xRange[0]; x <= xRange[1]; x += step) {
      try {
        const y = math.evaluate(expr, { x });
        if (typeof y === "number" && isFinite(y)) {
          pts.push({ x, y });
        }
      } catch {
        // skip
      }
    }
    return pts;
  }, [expr, xRange]);

  const yValues = points.map((p) => p.y);
  const yMin = Math.min(-1, ...yValues);
  const yMax = Math.max(1, ...yValues);
  const yPad = (yMax - yMin) * 0.1 || 1;

  const width = 800;
  const height = 500;
  const pad = 50;

  const toSvgX = (x: number) => pad + ((x - xRange[0]) / (xRange[1] - xRange[0])) * (width - 2 * pad);
  const toSvgY = (y: number) => height - pad - ((y - (yMin - yPad)) / (yMax - yMin + 2 * yPad)) * (height - 2 * pad);

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toSvgX(p.x).toFixed(2)} ${toSvgY(p.y).toFixed(2)}`)
    .join(" ");

  const zeroX = toSvgX(0);
  const zeroY = toSvgY(0);

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <div className="mb-6">
        <h2 className="text-3xl font-display font-bold text-foreground mb-2">Graph Visualizer</h2>
        <p className="text-muted-foreground font-body">Plot mathematical functions interactively</p>
      </div>

      {/* Input */}
      <div className="flex items-center gap-3 rounded-2xl bg-card golden-border card-shadow px-5 py-4 mb-4">
        <span className="text-primary font-display font-semibold">y =</span>
        <input
          type="text"
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          className="flex-1 bg-transparent text-foreground outline-none text-lg font-body"
          placeholder="x^2"
        />
        <button
          onClick={() => setShowKeyboard(!showKeyboard)}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <Keyboard className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {showKeyboard && (
        <div className="mb-4">
          <MathKeyboard
            onInsert={(v) => setExpr((prev) => prev + v)}
            visible={showKeyboard}
          />
        </div>
      )}

      {/* Presets */}
      <div className="flex flex-wrap gap-2 mb-6">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => setExpr(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-body transition-all ${
              expr === p
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-primary/10"
            }`}
          >
            y = {p}
          </button>
        ))}
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-muted-foreground font-body">Zoom:</span>
        {[5, 10, 20, 50].map((r) => (
          <button
            key={r}
            onClick={() => setXRange([-r, r])}
            className={`px-3 py-1 rounded-lg text-xs font-body transition-all ${
              xRange[1] === r ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            ±{r}
          </button>
        ))}
      </div>

      {/* Graph */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-card golden-border elevated-shadow overflow-hidden"
      >
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {/* Grid lines */}
          {Array.from({ length: 11 }, (_, i) => {
            const val = xRange[0] + ((xRange[1] - xRange[0]) * i) / 10;
            const sx = toSvgX(val);
            return (
              <g key={`grid-x-${i}`}>
                <line x1={sx} y1={pad} x2={sx} y2={height - pad} stroke="hsl(40, 20%, 92%)" strokeWidth="1" />
                <text x={sx} y={height - pad + 18} textAnchor="middle" fill="hsl(30, 8%, 50%)" fontSize="11" fontFamily="Inter">
                  {Math.round(val * 10) / 10}
                </text>
              </g>
            );
          })}

          {/* Axes */}
          {zeroX >= pad && zeroX <= width - pad && (
            <line x1={zeroX} y1={pad} x2={zeroX} y2={height - pad} stroke="hsl(30, 10%, 70%)" strokeWidth="1.5" />
          )}
          {zeroY >= pad && zeroY <= height - pad && (
            <line x1={pad} y1={zeroY} x2={width - pad} y2={zeroY} stroke="hsl(30, 10%, 70%)" strokeWidth="1.5" />
          )}

          {/* Curve */}
          <motion.path
            d={pathD}
            fill="none"
            stroke="hsl(43, 74%, 49%)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            key={expr + xRange.join(",")}
          />
        </svg>
      </motion.div>
    </div>
  );
};

export default GraphVisualizer;
