import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface GeminiCLIProps {
    onClose: () => void;
}

interface CLIMessage {
    type: 'input' | 'output' | 'error';
    content: string;
    timestamp: Date;
}

const systemPrompt = `You are a CLI assistant powered by Gemini AI. You help with construction management tasks, project planning, safety guidelines, and general business questions. Keep responses concise and practical. When appropriate, format your responses with simple text formatting.`;

export const GeminiCLI: React.FC<GeminiCLIProps> = ({ onClose }) => {
    const [messages, setMessages] = useState<CLIMessage[]>([
        {
            type: 'output',
            content: 'Gemini CLI v1.0.0 - Construction Management Assistant\nType your questions or commands below. Type "help" for available commands.',
            timestamp: new Date()
        }
    ]);
    const [currentInput, setCurrentInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [ai, setAi] = useState<GoogleGenAI | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        try {
            const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
            setAi(genAI);
        } catch (error) {
            console.error("Failed to initialize Gemini AI:", error);
            setMessages(prev => [...prev, {
                type: 'error',
                content: 'Error: Failed to initialize Gemini AI. Please check your API configuration.',
                timestamp: new Date()
            }]);
        }
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentInput.trim() || isLoading) return;

        const userInput = currentInput.trim();
        setCurrentInput('');

        // Add user input to messages
        setMessages(prev => [...prev, {
            type: 'input',
            content: `> ${userInput}`,
            timestamp: new Date()
        }]);

        // Handle built-in commands
        if (userInput.toLowerCase() === 'help') {
            setMessages(prev => [...prev, {
                type: 'output',
                content: `Available commands:
• help - Show this help message
• clear - Clear the console
• exit - Close the CLI
• Any question about construction, project management, safety, etc.

Examples:
> What are the key safety requirements for concrete work?
> How do I calculate material costs for a foundation?
> Draft a safety briefing for scaffold work`,
                timestamp: new Date()
            }]);
            return;
        }

        if (userInput.toLowerCase() === 'clear') {
            setMessages([{
                type: 'output',
                content: 'Gemini CLI v1.0.0 - Construction Management Assistant\nType your questions or commands below. Type "help" for available commands.',
                timestamp: new Date()
            }]);
            return;
        }

        if (userInput.toLowerCase() === 'exit') {
            onClose();
            return;
        }

        if (!ai) {
            setMessages(prev => [...prev, {
                type: 'error',
                content: 'Error: Gemini AI not initialized',
                timestamp: new Date()
            }]);
            return;
        }

        setIsLoading(true);

        try {
            const model = ai.models.get('gemini-2.5-flash');
            const result = await model.generateContent({
                contents: [{
                    role: 'user',
                    parts: [{ text: `${systemPrompt}\n\nUser query: ${userInput}` }]
                }]
            });

            const response = result.response;
            const text = response.text();

            setMessages(prev => [...prev, {
                type: 'output',
                content: text,
                timestamp: new Date()
            }]);
        } catch (error) {
            console.error("Gemini API error:", error);
            setMessages(prev => [...prev, {
                type: 'error',
                content: `Error: Failed to get response from Gemini AI. ${error instanceof Error ? error.message : 'Unknown error'}`,
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const formatMessage = (message: CLIMessage) => {
        const timeStr = message.timestamp.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });

        switch (message.type) {
            case 'input':
                return (
                    <div className="text-blue-600 font-mono">
                        <span className="text-slate-500 text-xs mr-2">[{timeStr}]</span>
                        {message.content}
                    </div>
                );
            case 'error':
                return (
                    <div className="text-red-600 font-mono">
                        <span className="text-slate-500 text-xs mr-2">[{timeStr}]</span>
                        {message.content}
                    </div>
                );
            default:
                return (
                    <div className="text-slate-800 font-mono whitespace-pre-wrap">
                        <span className="text-slate-500 text-xs mr-2">[{timeStr}]</span>
                        {message.content}
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <Card className="w-full max-w-4xl h-[80vh] flex flex-col bg-slate-900 text-green-400" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3" />
                        </svg>
                        <h2 className="text-xl font-bold text-green-400">@gemini-cli</h2>
                    </div>
                    <Button variant="secondary" onClick={onClose} className="bg-slate-800 text-slate-300 hover:bg-slate-700">
                        ✕
                    </Button>
                </div>

                <div className="flex-grow overflow-y-auto p-4 bg-black font-mono text-sm space-y-2">
                    {messages.map((msg, index) => (
                        <div key={index}>
                            {formatMessage(msg)}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="text-yellow-400 font-mono">
                            <span className="text-slate-500 text-xs mr-2">[{new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                            Processing... ⏳
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSubmit} className="p-4 border-t border-slate-700 bg-slate-900">
                    <div className="flex items-center gap-2">
                        <span className="text-green-400 font-mono">gemini@cli:~$</span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={currentInput}
                            onChange={(e) => setCurrentInput(e.target.value)}
                            className="flex-grow bg-transparent text-green-400 font-mono focus:outline-none"
                            placeholder="Type your command or question..."
                            disabled={isLoading}
                        />
                    </div>
                </form>
            </Card>
        </div>
    );
};