import { useRef, useState, useEffect } from "react";
import { useAskTutor } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { MathKeyboard } from "@/components/MathKeyboard";
import { Sparkles, Send, Calculator } from "lucide-react";

interface TutorMessage {
  role: "user" | "assistant";
  content: string;
}

interface TutorPanelProps {
  /** Lecture/problem context the tutor should ground its answers in. */
  contextText?: string | null;
  /** Heading shown above the conversation. */
  title?: string;
  /** Short hint describing what the tutor can help with right now. */
  subtitle?: string;
}

/**
 * Always-on AI tutor. Mounted during practice (never during graded
 * assignments). Keeps an in-component conversation and grounds every reply in
 * the supplied context text.
 */
export function TutorPanel({ contextText, title = "AI Tutor", subtitle }: TutorPanelProps) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const ask = useAskTutor();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, ask.isPending]);

  function insertAtCursor(text: string) {
    if (!text) return;
    const ta = taRef.current;
    setDraft((cur) => {
      if (ta && document.activeElement === ta) {
        const start = ta.selectionStart ?? cur.length;
        const end = ta.selectionEnd ?? cur.length;
        const caret = start + text.length;
        requestAnimationFrame(() => {
          ta.focus();
          try {
            ta.setSelectionRange(caret, caret);
          } catch {}
        });
        return cur.slice(0, start) + text + cur.slice(end);
      }
      return cur + text;
    });
  }

  function backspaceAtCursor() {
    const ta = taRef.current;
    setDraft((cur) => {
      if (ta && document.activeElement === ta) {
        const start = ta.selectionStart ?? cur.length;
        const end = ta.selectionEnd ?? cur.length;
        if (start === end) {
          if (start === 0) return cur;
          const caret = start - 1;
          requestAnimationFrame(() => {
            ta.focus();
            try {
              ta.setSelectionRange(caret, caret);
            } catch {}
          });
          return cur.slice(0, start - 1) + cur.slice(end);
        }
        requestAnimationFrame(() => {
          ta.focus();
          try {
            ta.setSelectionRange(start, start);
          } catch {}
        });
        return cur.slice(0, start) + cur.slice(end);
      }
      return cur.slice(0, -1);
    });
  }

  function send() {
    const message = draft.trim();
    if (!message || ask.isPending) return;
    setMessages((m) => [...m, { role: "user", content: message }]);
    setDraft("");
    ask.mutate(
      {
        data: {
          message,
          selectedLectureText: contextText ?? null,
        },
      },
      {
        onSuccess: (reply) => {
          setMessages((m) => [...m, { role: "assistant", content: reply.text }]);
        },
        onError: () => {
          setMessages((m) => [
            ...m,
            {
              role: "assistant",
              content:
                "Sorry — I couldn't reach the tutor just now. Try asking again in a moment.",
            },
          ]);
        },
      },
    );
  }

  return (
    <div className="flex flex-col h-full bg-card border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-secondary/40">
        <Sparkles className="w-4 h-4 text-primary" />
        <div className="flex flex-col">
          <span className="font-serif font-semibold leading-tight">{title}</span>
          {subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-[180px]">
        {messages.length === 0 && !ask.isPending && (
          <div className="text-sm text-muted-foreground">
            Stuck on a step? Ask me anything about this practice — I'll walk you
            through it without giving away the graded answers.
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "self-end max-w-[85%] rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm"
                : "self-start max-w-[90%] rounded-lg bg-secondary px-3 py-2 text-sm"
            }
          >
            {m.role === "assistant" ? (
              <div className="prose prose-sm max-w-none">
                <MarkdownRenderer content={m.content} />
              </div>
            ) : (
              m.content
            )}
          </div>
        ))}
        {ask.isPending && (
          <div className="self-start max-w-[90%] rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground italic">
            Thinking…
          </div>
        )}
      </div>

      <div className="border-t p-3 flex flex-col gap-2">
        <Textarea
          ref={taRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Ask the tutor…"
          className="min-h-[60px] resize-none"
        />
        {showKeyboard && (
          <MathKeyboard
            onInsert={insertAtCursor}
            onBackspace={backspaceAtCursor}
            onClear={() => setDraft("")}
          />
        )}
        <div className="flex justify-between">
          <Button
            size="sm"
            variant={showKeyboard ? "default" : "outline"}
            onClick={() => setShowKeyboard((v) => !v)}
            title="Math keyboard"
            data-testid="button-tutor-keyboard"
          >
            <Calculator className="w-4 h-4 mr-1" />
            Math
          </Button>
          <Button size="sm" onClick={send} disabled={!draft.trim() || ask.isPending}>
            <Send className="w-4 h-4 mr-1" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
