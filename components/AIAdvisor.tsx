import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface Message {
    role: 'user' | 'model';
    text: string;
}

const systemInstruction = `You are an expert business advisor for a small-to-medium-sized construction company. Your name is 'AS Agents Advisor'. Provide concise, actionable advice on topics like cash flow, risk management, project bidding, and operational efficiency. Use markdown for formatting like lists or bold text. Do not answer questions outside of this scope; if asked, politely state that you can only assist with construction business inquiries.`;

export const AIAdvisor: React.FC = () => {
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const chatSession = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: { systemInstruction },
            });
            setChat(chatSession);

            // Initial message from the advisor
            setMessages([{
                role: 'model',
                text: "Hi! I'm your Business Advisor. Ask me to review cash flow, tenders, ops risks, or suggest improvements."
            }]);
        } catch (error) {
            console.error("Failed to initialize AI Advisor:", error);
            setMessages([{
                role: 'model',
                text: "There was an error initializing the AI Advisor. Please check your API key configuration."
            }]);
        }
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || !chat) return;

        const userMessage: Message = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await chat.sendMessage({ message: input });
            const modelMessage: Message = { role: 'model', text: response.text };
            setMessages(prev => [...prev, modelMessage]);
        } catch (error) {
            console.error("Failed to send message:", error);
            const errorMessage: Message = { role: 'model', text: 'Sorry, I encountered an error. Please try again.' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const suggestedPrompts = [
        "Review our operations and propose a 30-60-90 day improvement plan.",
        "What are the top 3 financial risks for a company like ours?",
        "Help me draft a response to a client's request for a lower bid."
    ];

    return (
        <Card className="h-[75vh] flex flex-col">
            <h3 className="text-xl font-semibold text-slate-700 mb-2 flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                AI Business Advisor
            </h3>
             <p className="text-sm text-slate-500 mb-4 border-b pb-4">Your conversational assistant for business strategy and operational improvements.</p>
            <div className="flex-grow overflow-y-auto pr-4 space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'model' && (
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">AI</div>
                        )}
                        <div className={`max-w-xl p-3 rounded-lg ${msg.role === 'user' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-800'}`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                     <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">AI</div>
                        <div className="max-w-xl p-3 rounded-lg bg-slate-100 text-slate-800">
                           <span className="animate-pulse">...</span>
                        </div>
                    </div>
                )}
                 <div ref={messagesEndRef} />
            </div>
            <div className="mt-4 pt-4 border-t">
                <div className="flex flex-wrap gap-2 mb-2">
                    {suggestedPrompts.map(prompt => (
                        <button key={prompt} onClick={() => setInput(prompt)} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs">
                            {prompt}
                        </button>
                    ))}
                </div>
                <form onSubmit={sendMessage} className="flex items-center gap-2">
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage(e);
                            }
                        }}
                        placeholder="Ask for an audit, risks, roadmap, pricing suggestions..."
                        className="w-full p-2 border rounded-lg resize-none"
                        rows={2}
                        disabled={isLoading || !chat}
                    />
                    <Button type="submit" isLoading={isLoading} disabled={!input.trim() || !chat} size="lg">Send</Button>
                </form>
            </div>
        </Card>
    );
};