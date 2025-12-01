import { useEffect, useRef } from 'react';
import { useAppSelector } from '../redux/hooks';

const ChatBox = () => {
  const messages = useAppSelector((state) => state.app.messages);
  const isLoading = useAppSelector((state) => state.app.isLoading);
  const codeSections = useAppSelector((state) => state.app.codeSections);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex items-center justify-center px-4 py-8">
        <p className="text-vscode-description text-center text-xs font-mono">
          {codeSections.length === 0
            ? "// Select code to start..."
            : "// Ready to assist..."}
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-2 space-y-2 max-h-64 overflow-y-auto custom-scrollbar font-mono text-sm">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'
            } animate-slide-up`}
        >
          <div
            className={`rounded-lg px-3 py-1.5 max-w-[90%] ${message.role === 'user'
              ? 'bg-vscode-blue/20 text-vscode-text border border-vscode-blue/30'
              : 'bg-vscode-widget text-vscode-text border border-vscode-border'
              }`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>
      ))}
      {isLoading && (
        <div className="flex justify-start animate-fade-in">
          <div className="w-fit rounded-lg px-3 py-1.5 bg-vscode-widget border border-vscode-border">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-vscode-text/50 rounded-full animate-bounce"></div>
              <div
                className="w-1.5 h-1.5 bg-vscode-text/50 rounded-full animate-bounce"
                style={{ animationDelay: '0.1s' }}
              ></div>
              <div
                className="w-1.5 h-1.5 bg-vscode-text/50 rounded-full animate-bounce"
                style={{ animationDelay: '0.2s' }}
              ></div>
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatBox;

