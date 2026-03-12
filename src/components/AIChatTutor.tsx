import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send } from "lucide-react";

interface Message {
  role: "user" | "tutor";
  content: string;
}

const tutorResponses: Record<string, string> = {
  "integration": "Integration is the reverse process of differentiation. It finds the area under a curve. The basic notation is ∫f(x)dx. For example, ∫x dx = x²/2 + C.",
  "chain rule": "The chain rule is used to differentiate composite functions. If y = f(g(x)), then dy/dx = f'(g(x)) · g'(x). Think of it as 'derivative of the outside × derivative of the inside'.",
  "derivative": "A derivative measures how a function changes as its input changes. The derivative of f(x) = xⁿ is f'(x) = nxⁿ⁻¹. For example, d/dx(x³) = 3x².",
  "sin": "The derivative of sin(x) is cos(x). This is because as x changes by a small amount, sin(x) changes at a rate equal to cos(x). Geometrically, cos(x) represents the slope of the sine curve at any point.",
  "quadratic": "A quadratic equation has the form ax² + bx + c = 0. You can solve it by factoring, completing the square, or using the quadratic formula: x = (-b ± √(b²-4ac)) / 2a.",
};

const getResponse = (input: string): string => {
  const lower = input.toLowerCase();
  for (const [key, response] of Object.entries(tutorResponses)) {
    if (lower.includes(key)) return response;
  }
  return "Great question! Let me think about that. Could you be more specific about what part of the concept you'd like me to explain? I can help with algebra, calculus, trigonometry, and more.";
};

const AIChatTutor = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "tutor", content: "Hi! I'm your math tutor. Ask me anything about mathematics — I'll guide you step by step. 📐" },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", content: input };
    const tutorMsg: Message = { role: "tutor", content: getResponse(input) };
    setMessages((prev) => [...prev, userMsg, tutorMsg]);
    setInput("");
  };

  return (
    <>
      {/* FAB */}
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full gold-gradient text-primary-foreground elevated-shadow flex items-center justify-center hover:scale-105 transition-transform"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <MessageCircle className="h-6 w-6" />
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-[360px] max-h-[500px] rounded-2xl bg-card elevated-shadow golden-border flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-display font-semibold text-foreground">AI Math Tutor</h3>
                <p className="text-xs text-muted-foreground font-body">Ask me anything</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-secondary">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[300px]">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm font-body ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary text-secondary-foreground rounded-bl-md"
                    }`}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask a question..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground outline-none text-sm font-body"
                />
                <button
                  onClick={handleSend}
                  className="p-2.5 rounded-xl bg-primary text-primary-foreground"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatTutor;
