import { useMemo } from "react";

interface NormalDistributionProps {
  zScore: number;
  criticalValue?: number;
  twoTailed?: boolean;
  label?: string;
}

/**
 * SVG-based normal distribution curve showing test statistic
 * and shaded rejection region(s).
 */
const NormalDistribution = ({
  zScore,
  criticalValue = 1.96,
  twoTailed = true,
  label,
}: NormalDistributionProps) => {
  const W = 400;
  const H = 180;
  const PAD_X = 30;
  const PAD_TOP = 20;
  const PAD_BOT = 40;
  const plotW = W - 2 * PAD_X;
  const plotH = H - PAD_TOP - PAD_BOT;

  // Map z ∈ [-4, 4] → x pixel
  const zToX = (z: number) => PAD_X + ((z + 4) / 8) * plotW;
  const phi = (z: number) => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const yScale = plotH / phi(0);
  const zToY = (z: number) => PAD_TOP + plotH - phi(z) * yScale;

  // Curve path
  const curvePath = useMemo(() => {
    const pts: string[] = [];
    for (let z = -4; z <= 4; z += 0.05) {
      const x = zToX(z);
      const y = zToY(z);
      pts.push(`${pts.length === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return pts.join(" ");
  }, []);

  // Shaded rejection region path
  const shadedPath = (zStart: number, zEnd: number) => {
    const pts: string[] = [];
    const baseline = PAD_TOP + plotH;
    pts.push(`M${zToX(zStart).toFixed(1)},${baseline}`);
    for (let z = zStart; z <= zEnd; z += 0.05) {
      pts.push(`L${zToX(z).toFixed(1)},${zToY(z).toFixed(1)}`);
    }
    pts.push(`L${zToX(zEnd).toFixed(1)},${baseline}`);
    pts.push("Z");
    return pts.join(" ");
  };

  const absZ = Math.abs(zScore);
  const clampedZ = Math.max(-3.8, Math.min(3.8, zScore));
  const inRejection = absZ > criticalValue;

  return (
    <div className="p-4 rounded-xl bg-card golden-border card-shadow">
      {label && (
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          {label}
        </p>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md mx-auto" aria-label="Normal distribution curve">
        {/* Rejection regions */}
        {twoTailed ? (
          <>
            <path d={shadedPath(-4, -criticalValue)} className="fill-destructive/20" />
            <path d={shadedPath(criticalValue, 4)} className="fill-destructive/20" />
          </>
        ) : (
          <path d={shadedPath(criticalValue, 4)} className="fill-destructive/20" />
        )}

        {/* Curve */}
        <path d={curvePath} fill="none" className="stroke-primary" strokeWidth="2" />

        {/* Baseline */}
        <line x1={PAD_X} y1={PAD_TOP + plotH} x2={W - PAD_X} y2={PAD_TOP + plotH} className="stroke-border" strokeWidth="1" />

        {/* Critical value lines */}
        {twoTailed && (
          <line
            x1={zToX(-criticalValue)} y1={PAD_TOP}
            x2={zToX(-criticalValue)} y2={PAD_TOP + plotH}
            className="stroke-destructive/60" strokeWidth="1" strokeDasharray="4,3"
          />
        )}
        <line
          x1={zToX(criticalValue)} y1={PAD_TOP}
          x2={zToX(criticalValue)} y2={PAD_TOP + plotH}
          className="stroke-destructive/60" strokeWidth="1" strokeDasharray="4,3"
        />

        {/* Z-score marker */}
        <line
          x1={zToX(clampedZ)} y1={PAD_TOP}
          x2={zToX(clampedZ)} y2={PAD_TOP + plotH}
          className={inRejection ? "stroke-destructive" : "stroke-primary"}
          strokeWidth="2"
        />
        <circle
          cx={zToX(clampedZ)}
          cy={zToY(clampedZ)}
          r="4"
          className={inRejection ? "fill-destructive" : "fill-primary"}
        />

        {/* Labels */}
        <text x={zToX(0)} y={H - 5} textAnchor="middle" className="fill-muted-foreground text-[10px]">0</text>
        {twoTailed && (
          <text x={zToX(-criticalValue)} y={H - 5} textAnchor="middle" className="fill-destructive text-[10px]">
            −{criticalValue}
          </text>
        )}
        <text x={zToX(criticalValue)} y={H - 5} textAnchor="middle" className="fill-destructive text-[10px]">
          {criticalValue}
        </text>
        <text x={zToX(clampedZ)} y={H - 18} textAnchor="middle" className={`text-[10px] font-semibold ${inRejection ? "fill-destructive" : "fill-primary"}`}>
          Z={zScore.toFixed(2)}
        </text>

        {/* Region labels */}
        <text x={zToX(-3)} y={PAD_TOP + 14} textAnchor="middle" className="fill-destructive/70 text-[8px]">Reject</text>
        <text x={zToX(3)} y={PAD_TOP + 14} textAnchor="middle" className="fill-destructive/70 text-[8px]">Reject</text>
        <text x={zToX(0)} y={PAD_TOP + 14} textAnchor="middle" className="fill-muted-foreground text-[8px]">Fail to reject</text>
      </svg>
      <p className="text-center text-xs text-muted-foreground mt-1">
        {inRejection
          ? "The test statistic falls in the rejection region."
          : "The test statistic falls within the acceptance region."}
      </p>
    </div>
  );
};

export default NormalDistribution;
