import { useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart3, Target, TrendingUp } from "lucide-react";
import { getHistory } from "@/lib/history";

const ProgressTracker = () => {
  const history = useMemo(() => getHistory(), []);
  const totalProblems = history.length;
  const testQuestions = history.filter((h) => h.type === "test");
  const searches = history.filter((h) => h.type === "search");

  const stats = [
    { label: "Problems Solved", value: totalProblems, icon: Target, color: "bg-primary/10 text-primary" },
    { label: "Searches", value: searches.length, icon: BarChart3, color: "bg-accent/20 text-accent-foreground" },
    { label: "Tests Taken", value: testQuestions.length, icon: TrendingUp, color: "bg-secondary text-secondary-foreground" },
  ];

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="grid gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-4 p-4 rounded-xl bg-card golden-border card-shadow"
          >
            <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground font-body">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ProgressTracker;
