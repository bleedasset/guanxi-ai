"use client";

import { useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
  chinese?: string;
  feedback?: string;
};

type Assessment = {
  scores: {
    politeness: number;
    hierarchy: number;
    guanxi: number;
    patience: number;
  };
  summary: string;
  tips: string[];
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMessage: Message = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setStreamingText("");
    setIsStreaming(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    const data = await res.json();
    const fullText = data.reply;
    let i = 0;

    const interval = setInterval(() => {
      i++;
      setStreamingText(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(interval);
        setIsStreaming(false);
        setStreamingText("");
        setMessages([...updatedMessages, {
          role: "assistant",
          content: data.reply,
          chinese: data.chinese,
          feedback: data.feedback,
        }]);
        setLoading(false);
      }
    }, 18);
  };

  const getAssessment = async () => {
    if (messages.length < 4) return;
    setLoading(true);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assess: true,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    const data = await res.json();
    setAssessment(data.assessment);
    setLoading(false);
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const scoreBar = (score: number) => {
    const color = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : "bg-red-500";
    return (
      <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
        <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${score}%` }} />
      </div>
    );
  };

  const userCount = messages.filter(m => m.role === "user").length;

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center p-6">
      <div className="w-full max-w-2xl mb-6 text-center">
        <h1 className="text-4xl font-bold text-red-500 mb-1">Guanxi.AI</h1>
        <p className="text-gray-400">First meeting with a Chinese business partner over dinner</p>
      </div>

      {assessment && (
        <div className="w-full max-w-2xl mb-6 bg-gray-900 border border-gray-700 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">📊 Your Assessment</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {Object.entries(assessment.scores).map(([key, val]) => (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize text-gray-300">{key}</span>
                  <span className={`font-bold ${scoreColor(val)}`}>{val}</span>
                </div>
                {scoreBar(val)}
              </div>
            ))}
          </div>
          <p className="text-gray-300 text-sm mb-4">{assessment.summary}</p>
          <div className="flex flex-col gap-2">
            {assessment.tips.map((tip, i) => (
              <div key={i} className="text-xs text-gray-400 bg-gray-800 px-3 py-2 rounded-lg">
                • {tip}
              </div>
            ))}
          </div>
          <button
            onClick={() => { setMessages([]); setAssessment(null); }}
            className="mt-4 w-full bg-gray-700 hover:bg-gray-600 py-2 rounded-xl text-sm transition"
          >
            Start Over
          </button>
        </div>
      )}

      {!assessment && (
        <>
          <div className="w-full max-w-2xl mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Conversation progress</span>
              <span>{Math.min(userCount, 4)} / 4 exchanges</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1.5">
              <div
                className="bg-red-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(userCount / 4 * 100, 100)}%` }}
              />
            </div>
            {userCount >= 4 && (
              <p className="text-xs text-yellow-400 mt-1">✓ Ready for assessment</p>
            )}
          </div>

          <div className="w-full max-w-2xl flex flex-col gap-4 mb-4 min-h-[400px]">
            {messages.length === 0 && (
              <div className="text-center text-gray-600 mt-20">
                Start the conversation. Introduce yourself to Wei Mingzhi.
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className={`px-4 py-3 rounded-2xl max-w-[80%] text-sm leading-relaxed ${
                  msg.role === "user" ? "bg-red-600 self-end" : "bg-gray-800 self-start"
                }`}>
                  {msg.role === "assistant" && (
                    <p className="text-xs text-gray-400 mb-1 font-semibold">Wei Mingzhi</p>
                  )}
                  <p>{msg.content}</p>
                  {msg.chinese && (
                    <p className="mt-2 text-sm text-gray-400 italic border-t border-gray-700 pt-2">
                      "{msg.chinese}"
                    </p>
                  )}
                </div>
                {msg.feedback && (
                  <div className="self-start bg-yellow-900/40 border border-yellow-700/40 text-yellow-300 text-xs px-4 py-2 rounded-xl max-w-[80%]">
                    💡 {msg.feedback}
                  </div>
                )}
              </div>
            ))}

            {isStreaming && (
              <div className="bg-gray-800 self-start px-4 py-3 rounded-2xl max-w-[80%] text-sm leading-relaxed">
                <p className="text-xs text-gray-400 mb-1 font-semibold">Wei Mingzhi</p>
                <p>{streamingText}<span className="animate-pulse">▌</span></p>
              </div>
            )}

            {loading && !isStreaming && (
              <div className="bg-gray-800 self-start px-4 py-3 rounded-2xl text-sm text-gray-400">
                Wei Mingzhi is thinking...
              </div>
            )}
          </div>

          <div className="w-full max-w-2xl flex gap-2">
            <input
              className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-sm"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 px-5 py-3 rounded-xl text-sm font-semibold transition"
            >
              Send
            </button>
          </div>

          {userCount >= 4 && (
            <button
              onClick={getAssessment}
              disabled={loading}
              className="mt-3 w-full max-w-2xl bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 py-3 rounded-xl text-sm font-semibold transition"
            >
              📊 Get Assessment
            </button>
          )}
        </>
      )}
    </main>
  );
}