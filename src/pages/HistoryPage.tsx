import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Trash2, Search, FlaskConical } from "lucide-react";
import { getHistory, clearHistory, HistoryEntry } from "@/lib/history";

const HistoryPage = () => {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setEntries(getHistory());
  }, []);

  const handleClear = () => {
    clearHistory();
    setEntries([]);
  };

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">History</h1>
            <p className="text-muted-foreground font-body">Your session history — clears on refresh</p>
          </div>
          {entries.length > 0 && (
            <button
              onClick={handleClear}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm hover:bg-destructive/10 hover:text-destructive transition-colors font-body"
            >
              <Trash2 className="h-4 w-4" /> Clear
            </button>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-20">
            <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-body">No history yet. Start solving problems!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-xl bg-card golden-border card-shadow flex items-start gap-4"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  entry.type === "search" ? "bg-primary/10 text-primary" : "bg-accent/20 text-accent-foreground"
                }`}>
                  {entry.type === "search" ? <Search className="h-4 w-4" /> : <FlaskConical className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body font-medium text-foreground truncate">{entry.query}</p>
                  <p className="text-sm text-muted-foreground font-body mt-0.5">{entry.answer}</p>
                </div>
                <span className="text-xs text-muted-foreground font-body shrink-0">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
