import { motion } from "framer-motion";
import SearchSection from "@/components/SearchSection";
import DailyChallenge from "@/components/DailyChallenge";
import ProgressTracker from "@/components/ProgressTracker";

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-16 pb-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground mb-4">
            Mathematics, <span className="gold-text">beautifully</span> understood
          </h1>
          <p className="text-lg text-muted-foreground font-body max-w-2xl mx-auto">
            Search problems, explore step-by-step solutions, practice with interactive exercises, and visualize mathematics.
          </p>
        </motion.div>

        <SearchSection />
      </section>

      {/* Bottom section */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 items-start">
          <DailyChallenge />
          <ProgressTracker />
        </div>
      </section>
    </div>
  );
};

export default Index;
