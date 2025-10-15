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
        <p className="text-gray-500 dark:text-gray-400 text-center text-sm">
          {codeSections.length === 0 
            ? "Select code on the page to get started"
            : "Ask a question or use quick actions"}
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-3 max-h-64 overflow-y-auto">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`rounded-lg px-4 py-2 ${
              message.role === 'user'
                ? 'max-w-[80%] bg-blue-500 text-white'
                : 'w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>
      ))}
      {isLoading && (
        <div className="flex justify-start">
          <div className="w-fit rounded-lg px-4 py-2 bg-gray-100 dark:bg-gray-700">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '0.1s' }}
              ></div>
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
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

