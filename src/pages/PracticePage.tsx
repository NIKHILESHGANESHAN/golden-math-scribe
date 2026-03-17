import { useState } from "react";
import PracticeGenerator from "@/components/PracticeGenerator";
import ErrorDetectionTutor from "@/components/ErrorDetectionTutor";

const PracticePage = () => {
  const [tab, setTab] = useState<"practice" | "checker">("practice");

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-3xl mx-auto px-4 mb-8">
        <div className="flex gap-2">
          <button
            onClick={() => setTab("practice")}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium font-body transition-all ${
              tab === "practice" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-primary/10"
            }`}
          >
            Practice Problems
          </button>
          <button
            onClick={() => setTab("checker")}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium font-body transition-all ${
              tab === "checker" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-primary/10"
            }`}
          >
            Step Checker
          </button>
        </div>
      </div>
      {tab === "practice" ? <PracticeGenerator /> : <ErrorDetectionTutor />}
    </div>
  );
};

export default PracticePage;
