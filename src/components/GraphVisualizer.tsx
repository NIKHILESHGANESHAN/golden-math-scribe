import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Keyboard, TrendingUp, Layers } from "lucide-react";
import MathKeyboard from "./MathKeyboard";
import * as math from "mathjs";

const presets = ["x^2", "sin(x)", "x^3 - 2*x", "cos(x)", "log(x)", "sqrt(x)"];

const GraphVisualizer = () => {
  const [expr, setExpr] = useState("x^2");
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [xRange, setXRange] = useState<[number, number]>([-10, 10]);
  const [showDerivative, setShowDerivative] = useState(false);
  const [showIntegral, setShowIntegral] = useState(false);

  const points = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    const step = (xRange[1] - xRange[0]) / 400;
    for (let x = xRange[0]; x <= xRange[1]; x += step) {
      try {
        const y = math.evaluate(expr, { x });
        if (typeof y === "number" && isFinite(y)) pts.push({ x, y });
      } catch { /* skip */ }
    }
    return pts;
  }, [expr, xRange]);

  // Derivative points
  const derivativePoints = useMemo(() => {
    if (!showDerivative) return [];
    try {
      const deriv = math.derivative(expr, "x");
      const derivStr = deriv.toString();
      const pts: { x: number; y: number }[] = [];
      const step = (xRange[1] - xRange[0]) / 400;
      for (let x = xRange[0]; x <= xRange[1]; x += step) {
        try {
          const y = math.evaluate(derivStr, { x });
          if (typeof y === "number" && isFinite(y)) pts.push({ x, y });
        } catch { /* skip */ }
      }
      return pts;
    } catch { return []; }
  }, [expr, xRange, showDerivative]);

  // Find roots (where y crosses zero)
  const roots = useMemo(() => {
    const r: { x: number; y: number }[] = [];
    for (let i = 1; i < points.length; i++) {
      if (points[i - 1].y * points[i].y < 0) {
        // Linear interpolation
        const x0 = points[i - 1].x, y0 = points[i - 1].y;
        const x1 = points[i].x, y1 = points[i].y;
        const xr = x0 - y0 * (x1 - x0) / (y1 - y0);
        r.push({ x: xr, y: 0 });
      }
    }
    return r;
  }, [points]);

  // Find extrema (where derivative changes sign)
  const extrema = useMemo(() => {
    const ex: { x: number; y: number; type: "max" | "min" }[] = [];
    for (let i = 2; i < points.length; i++) {
      const dy1 = points[i - 1].y - points[i - 2].y;
      const dy2 = points[i].y - points[i - 1].y;
      if (dy1 > 0 && dy2 < 0) ex.push({ ...points[i - 1], type: "max" });
      if (dy1 < 0 && dy2 > 0) ex.push({ ...points[i - 1], type: "min" });
    }
    return ex;
  }, [points]);

  const allPoints = [...points, ...derivativePoints];
  const yValues = allPoints.map(p => p.y);
  const yMin = Math.min(-1, ...yValues);
  const yMax = Math.max(1, ...yValues);
  const yPad = (yMax - yMin) * 0.1 || 1;

  const width = 800;
  const height = 500;
  const pad = 50;

  const toSvgX = (x: number) => pad + ((x - xRange[0]) / (xRange[1] - xRange[0])) * (width - 2 * pad);
  const toSvgY = (y: number) => height - pad - ((y - (yMin - yPad)) / (yMax - yMin + 2 * yPad)) * (height - 2 * pad);

  const buildPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${toSvgX(p.x).toFixed(2)} ${toSvgY(p.y).toFixed(2)}`).join(" ");

  // Integral shading (area between curve and x-axis)
  const integralPath = useMemo(() => {
    if (!showIntegral || points.length < 2) return "";
    const zeroY = toSvgY(0);
    let d = `M ${toSvgX(points[0].x).toFixed(2)} ${zeroY}`;
    for (const p of points) {
      d += ` L ${toSvgX(p.x).toFixed(2)} ${toSvgY(p.y).toFixed(2)}`;
    }
    d += ` L ${toSvgX(points[points.length - 1].x).toFixed(2)} ${zeroY} Z`;
    return d;
  }, [points, showIntegral, xRange, yMin, yMax]);

  const pathD = buildPath(points);
  const derivPathD = buildPath(derivativePoints);
  const zeroX = toSvgX(0);
  const zeroY = toSvgY(0);

  let derivLabel = "";
  try { derivLabel = math.derivative(expr, "x").toString(); } catch { /* skip */ }

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <div className="mb-6">
        <h2 className="text-3xl font-display font-bold text-foreground mb-2">Graph Visualizer</h2>
        <p className="text-muted-foreground font-body">Plot functions with roots, extrema, and derivative visualization</p>
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
        <button onClick={() => setShowKeyboard(!showKeyboard)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <Keyboard className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {showKeyboard && (
        <div className="mb-4">
          <MathKeyboard onInsert={(v) => setExpr(prev => prev + v)} visible={showKeyboard} />
        </div>
      )}

      {/* Presets */}
      <div className="flex flex-wrap gap-2 mb-4">
        {presets.map(p => (
          <button
            key={p}
            onClick={() => setExpr(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-body transition-all ${
              expr === p ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-primary/10"
            }`}
          >
            y = {p}
          </button>
        ))}
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground font-body">Zoom:</span>
          {[5, 10, 20, 50].map(r => (
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

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setShowDerivative(!showDerivative)}
            className={`px-3 py-1.5 rounded-lg text-xs font-body flex items-center gap-1.5 transition-all ${
              showDerivative ? "bg-blue-500/10 text-blue-600 border border-blue-500/20" : "bg-secondary text-secondary-foreground"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" /> f'(x)
          </button>
          <button
            onClick={() => setShowIntegral(!showIntegral)}
            className={`px-3 py-1.5 rounded-lg text-xs font-body flex items-center gap-1.5 transition-all ${
              showIntegral ? "bg-green-500/10 text-green-600 border border-green-500/20" : "bg-secondary text-secondary-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5" /> ∫f(x)
          </button>
        </div>
      </div>

      {/* Info badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {roots.length > 0 && (
          <span className="px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-body">
            {roots.length} root{roots.length > 1 ? "s" : ""}: {roots.map(r => `x ≈ ${r.x.toFixed(2)}`).join(", ")}
          </span>
        )}
        {extrema.map((e, i) => (
          <span key={i} className={`px-3 py-1 rounded-full text-xs font-body ${
            e.type === "max" ? "bg-primary/10 text-primary" : "bg-blue-500/10 text-blue-600"
          }`}>
            {e.type === "max" ? "Max" : "Min"} at ({e.x.toFixed(2)}, {e.y.toFixed(2)})
          </span>
        ))}
        {showDerivative && derivLabel && (
          <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 text-xs font-body">
            f'(x) = {derivLabel}
          </span>
        )}
      </div>

      {/* Graph */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-card golden-border elevated-shadow overflow-hidden"
      >
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {/* Grid */}
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

          {/* Integral shading */}
          {showIntegral && integralPath && (
            <path d={integralPath} fill="hsl(120, 40%, 50%)" fillOpacity="0.12" stroke="none" />
          )}

          {/* Main curve */}
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

          {/* Derivative curve */}
          {showDerivative && derivPathD && (
            <motion.path
              d={derivPathD}
              fill="none"
              stroke="hsl(220, 70%, 55%)"
              strokeWidth="2"
              strokeDasharray="6 3"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              key={`deriv-${expr}-${xRange.join(",")}`}
            />
          )}

          {/* Root markers */}
          {roots.map((r, i) => (
            <g key={`root-${i}`}>
              <circle cx={toSvgX(r.x)} cy={toSvgY(0)} r="6" fill="hsl(0, 72%, 51%)" opacity="0.8" />
              <circle cx={toSvgX(r.x)} cy={toSvgY(0)} r="3" fill="hsl(0, 0%, 100%)" />
            </g>
          ))}

          {/* Extrema markers */}
          {extrema.map((e, i) => (
            <g key={`ext-${i}`}>
              <circle
                cx={toSvgX(e.x)}
                cy={toSvgY(e.y)}
                r="6"
                fill={e.type === "max" ? "hsl(43, 74%, 49%)" : "hsl(220, 70%, 55%)"}
                opacity="0.8"
              />
              <text
                x={toSvgX(e.x)}
                y={toSvgY(e.y) - 12}
                textAnchor="middle"
                fill={e.type === "max" ? "hsl(43, 74%, 35%)" : "hsl(220, 70%, 40%)"}
                fontSize="10"
                fontFamily="Inter"
                fontWeight="600"
              >
                {e.type === "max" ? "▲" : "▼"} ({e.x.toFixed(1)}, {e.y.toFixed(1)})
              </text>
            </g>
          ))}
        </svg>
      </motion.div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-3 px-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-body">
          <div className="w-4 h-0.5 bg-[hsl(43,74%,49%)] rounded" /> f(x)
        </div>
        {showDerivative && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-body">
            <div className="w-4 h-0.5 bg-[hsl(220,70%,55%)] rounded border-dashed" style={{ borderTop: "2px dashed hsl(220,70%,55%)", height: 0 }} /> f'(x)
          </div>
        )}
        {roots.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-body">
            <div className="w-3 h-3 rounded-full bg-destructive/80" /> Roots
          </div>
        )}
        {extrema.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-body">
            <div className="w-3 h-3 rounded-full bg-primary/80" /> Extrema
          </div>
        )}
      </div>
    </div>
  );
};

export default GraphVisualizer;
