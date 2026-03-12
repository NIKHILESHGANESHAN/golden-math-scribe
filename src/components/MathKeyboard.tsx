import { motion } from "framer-motion";

const symbols = [
  { label: "√", value: "√(" },
  { label: "π", value: "π" },
  { label: "∫", value: "∫" },
  { label: "Σ", value: "Σ" },
  { label: "x²", value: "^2" },
  { label: "xⁿ", value: "^" },
  { label: "÷", value: "/" },
  { label: "×", value: "*" },
  { label: "±", value: "±" },
  { label: "∞", value: "∞" },
  { label: "≤", value: "≤" },
  { label: "≥", value: "≥" },
  { label: "(", value: "(" },
  { label: ")", value: ")" },
  { label: "sin", value: "sin(" },
  { label: "cos", value: "cos(" },
  { label: "tan", value: "tan(" },
  { label: "log", value: "log(" },
  { label: "ln", value: "ln(" },
  { label: "e", value: "e" },
];

const MathKeyboard = ({
  onInsert,
  visible,
}: {
  onInsert: (value: string) => void;
  visible: boolean;
}) => {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-card golden-border card-shadow"
    >
      {symbols.map((sym) => (
        <button
          key={sym.label}
          onClick={() => onInsert(sym.value)}
          className="px-3 py-2 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-all hover:scale-105 active:scale-95"
        >
          {sym.label}
        </button>
      ))}
    </motion.div>
  );
};

export default MathKeyboard;
