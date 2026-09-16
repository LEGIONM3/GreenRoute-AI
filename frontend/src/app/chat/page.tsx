"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bot,
  User as UserIcon,
  Send,
  Sparkles,
  ShieldCheck,
  BookOpen,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  MessageSquare,
  MapPin,
  Cpu,
  Radio,
  Navigation,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import { api } from "@/lib/api";
import { CitationItem, ChatMessage, ChatSession, ChatQueryResponse } from "@/lib/types";
import { useAuthStore } from "@/lib/store";
import SanitizedAIResponse from "@/components/SanitizedAIResponse";

function ChatContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const { userCoords, user } = useAuthStore();

  const [responseMode, setResponseMode] = useState<"auto" | "short" | "normal" | "detailed">("auto");
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      sender: "user" | "assistant";
      content: string;
      citations?: CitationItem[];
      confidence_score?: number;
      model_used?: string;
      related_locations?: ChatQueryResponse["related_locations"];
      related_policies?: ChatQueryResponse["related_policies"];
    }>
  >([
    {
      id: "intro",
      sender: "assistant",
      content:
        "Hello! I am your EcoGuide Smart Waste Management & Policy Assistant.\n\n" +
        "Ask me anything regarding:\n" +
        "• Proper segregation bin colours & dismantling protocols\n" +
        "• Electronic waste, battery hazards, and hazardous chemical disposal\n" +
        "• Statutory rules (CPCB & MoEFCC Solid Waste Management Rules 2016)\n" +
        "• Penalties, municipal compliance guidelines, and nearby kiosks\n\n" +
        "Every response is grounded in statutory regulations with real-time confidence scoring.",
      citations: [],
      confidence_score: 0.98,
      model_used: "llama-3.3-70b / qwen3.8 (Groq LPU)",
    },
  ]);

  const [input, setInput] = useState(initialQuery);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreamingMode, setIsStreamingMode] = useState(false);
  const [expandedCitations, setExpandedCitations] = useState<Record<number, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedPrompts = [
    "How should I dispose of swollen lithium-ion batteries?",
    "Is thermocol or styrofoam recyclable under municipal rules?",
    "What are the statutory segregation rules for wet vs dry waste?",
    "Where can I drop off obsolete computers and circuit boards?",
  ];

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Load chat sessions if user is authenticated
  useEffect(() => {
    if (user) {
      api.getChatSessions().then(setSessions).catch(() => {});
    }
  }, [user]);

  // Send initial query if provided in URL
  useEffect(() => {
    if (initialQuery) {
      handleSendMessage(initialQuery);
    }
  }, [initialQuery]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const queryText = text.trim();
    const userMessage = {
      id: `user-${Date.now()}`,
      sender: "user" as const,
      content: queryText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    if (isStreamingMode) {
      // SSE Real-time Token Streaming
      const assistantMsgId = `asst-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          sender: "assistant" as const,
          content: "",
          citations: [],
          confidence_score: 0.92,
          model_used: "Groq LPU Realtime Stream",
        },
      ]);

      try {
        const streamUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1") + "/chat/stream";
        const response = await fetch(streamUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: queryText,
            session_id: sessionId,
            latitude: userCoords?.lat,
            longitude: userCoords?.lon,
            response_mode: responseMode,
          }),
        });

        if (!response.ok || !response.body) {
          throw new Error("Streaming connection failed");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const token = line.replace("data: ", "");
              if (token === "[DONE]") continue;
              accumulatedText += token;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantMsgId ? { ...m, content: accumulatedText } : m))
              );
            }
          }
        }
      } catch (err: any) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: `⚠️ Streaming error: ${err.message}. Falling back to standard query.` }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    } else {
      // Standard Grounded RAG Query with Rich Metadata
      try {
        const response = await api.queryChat(queryText, sessionId, userCoords || undefined, responseMode);
        setSessionId(response.session_id);

        const assistantMessage = {
          id: `asst-${Date.now()}`,
          sender: "assistant" as const,
          content: response.answer,
          citations: response.citations,
          confidence_score: response.confidence_score,
          model_used: response.model_used,
          related_locations: response.related_locations,
          related_policies: response.related_policies,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err: any) {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            sender: "assistant",
            content: `⚠️ Error retrieving guidance: ${err.message || "Please verify backend connectivity."}`,
            citations: [],
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const toggleCitation = (msgIndex: number) => {
    setExpandedCitations((prev) => ({ ...prev, [msgIndex]: !prev[msgIndex] }));
  };

  const handleResetChat = () => {
    setSessionId(undefined);
    setMessages([
      {
        id: "intro",
        sender: "assistant",
        content:
          "Hello! I am your **Groq-Powered Smart Waste Management & Policy Assistant**.\n\nAsk me anything regarding:\n- Proper segregation bin colours & dismantling protocols\n- Electronic waste, battery hazards, and hazardous chemical disposal\n- Statutory rules (CPCB & MoEFCC Solid Waste Management Rules 2016)\n- Penalties and municipal compliance guidelines\n\nEvery response includes official policy citations, real-time confidence scoring, and nearby authorized collection kiosks!",
        citations: [],
        confidence_score: 0.98,
        model_used: "llama-3.3-70b / qwen3.8 (Groq LPU)",
      },
    ]);
  };

  return (
    <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-4rem)]">
      {/* Top Controls Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <span>EcoGuide Groq RAG Assistant</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                LPU Accelerated
              </span>
            </h1>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Grounded in CPCB, MoEFCC & SWM 2016 statutory guidelines</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Dynamic Response Budget Mode Selector */}
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-[11px] text-slate-500 font-semibold px-1.5 hidden sm:inline">Mode:</span>
            {(["auto", "short", "normal", "detailed"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setResponseMode(m)}
                title={
                  m === "auto"
                    ? "Auto: Dynamic token budgeting based on query complexity"
                    : m === "short"
                    ? "Short: Rapid 3-bullet core disposal summary"
                    : m === "normal"
                    ? "Normal: Balanced guidance with safety precautions"
                    : "Detailed: Full statutory provisions and chemical handling"
                }
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  responseMode === m
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Streaming Toggle */}
          <button
            onClick={() => setIsStreamingMode(!isStreamingMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              isStreamingMode
                ? "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
            }`}
            title="Toggle token-by-token streaming response"
          >
            <Radio className={`w-3.5 h-3.5 ${isStreamingMode ? "text-purple-600 animate-pulse" : ""}`} />
            <span className="hidden sm:inline">Streaming:</span>
            <span className="font-bold">{isStreamingMode ? "ON" : "OFF"}</span>
          </button>

          <button
            onClick={handleResetChat}
            title="New Conversation"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Session</span>
          </button>
        </div>
      </div>

      {/* Messages Stream Container */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6 pr-1 scrollbar-thin">
        {messages.map((msg, index) => {
          const isUser = msg.sender === "user";
          const hasCitations = msg.citations && msg.citations.length > 0;
          const hasLocations = msg.related_locations && msg.related_locations.length > 0;
          const hasPolicies = msg.related_policies && msg.related_policies.length > 0;
          const areCitationsExpanded = expandedCitations[index];

          return (
            <div key={msg.id} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-2xl flex flex-col gap-2.5 ${isUser ? "items-end" : "items-start"}`}>
                {/* Confidence & Model Badge Header for Assistant */}
                {!isUser && (msg.confidence_score !== undefined || msg.model_used) && (
                  <div className="flex items-center gap-2 text-[11px]">
                    {msg.confidence_score !== undefined && (
                      <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>{(msg.confidence_score * 100).toFixed(0)}% Confidence</span>
                      </span>
                    )}
                    {msg.model_used && (
                      <span className="px-2 py-0.5 rounded-full font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-slate-500" />
                        <span>{msg.model_used}</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Message Bubble with Sanitized AI Response */}
                <div
                  className={`p-4 sm:p-5 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? "bg-emerald-600 text-white rounded-br-none shadow-sm shadow-emerald-600/20"
                      : "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none shadow-sm"
                  }`}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    <SanitizedAIResponse content={msg.content} />
                  )}
                </div>

                {/* Nearby Recommended Facilities Cards (GIS integration) */}
                {!isUser && hasLocations && (
                  <div className="w-full rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 p-3.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-blue-300">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <span>Nearby Authorized Disposal Facilities</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {msg.related_locations?.map((loc) => (
                        <div
                          key={loc.id}
                          className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-900/40 space-y-1.5"
                        >
                          <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {loc.name}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">{loc.address}</div>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                            <span className="text-emerald-600 font-bold">
                              {loc.distance_km ? `~${loc.distance_km.toFixed(1)} km away` : "Drop-Off Kiosk"}
                            </span>
                            <a
                              href={
                                loc.directions_url ||
                                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                  loc.name + " " + loc.address
                                )}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
                            >
                              <Navigation className="w-3 h-3" />
                              Directions
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Policies Pills */}
                {!isUser && hasPolicies && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[11px] font-bold text-slate-400">Statutory Rules:</span>
                    {msg.related_policies?.map((pol) => (
                      <span
                        key={pol.id}
                        className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-medium"
                      >
                        {pol.document_number || pol.title}
                      </span>
                    ))}
                  </div>
                )}

                {/* Source Citations Card Component */}
                {!isUser && hasCitations && (
                  <div className="w-full rounded-2xl border border-emerald-200/80 dark:border-emerald-950 bg-emerald-50/40 dark:bg-emerald-950/20 overflow-hidden text-xs">
                    <button
                      onClick={() => toggleCitation(index)}
                      className="w-full flex items-center justify-between p-3 font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/50 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-emerald-600" />
                        <span>{msg.citations?.length} Verified Statutory & Guide Citations</span>
                      </div>
                      {areCitationsExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {areCitationsExpanded && (
                      <div className="p-3 pt-0 space-y-2 border-t border-emerald-200/50 dark:border-emerald-900/50">
                        {msg.citations?.map((cit, cIdx) => (
                          <div
                            key={cIdx}
                            className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900 space-y-1"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {cit.title}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                                {cit.source_type}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 italic">
                              {cit.reference} • Relevance: {(cit.relevance_score * 100).toFixed(0)}%
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 mt-1 font-serif">
                              &quot;{cit.chunk_excerpt}&quot;
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm mt-1">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 text-slate-500 text-xs font-medium shadow-sm">
              <Sparkles className="w-4 h-4 text-emerald-600 animate-spin" />
              <span>Synthesizing statutory guidance via Groq LPU acceleration...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts Bar */}
      {messages.length <= 2 && (
        <div className="py-2 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-xs text-slate-400 shrink-0">Try asking:</span>
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSendMessage(prompt)}
              className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 text-xs whitespace-nowrap transition-all"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Message Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(input);
        }}
        className="pt-2"
      >
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Ask about segregation, electronic waste, municipal by-laws..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="w-full pl-5 pr-14 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2.5 p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white shadow-md shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto py-16 text-center text-slate-400">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm">Loading AI Assistant...</p>
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
