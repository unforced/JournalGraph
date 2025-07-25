import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, ChevronRight } from 'lucide-react';
import { structureDiscoveryApi } from '../api/structureDiscovery';
import { HybridStructureBuilder } from './HybridStructureBuilder';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  suggestions?: StructureSuggestion[];
  quickReplies?: string[];
}

interface StructureSuggestion {
  structure_id: string;
  name: string;
  description: string;
  relevance_score: number;
}

interface StructureDiscoveryChatProps {
  sampleEntries: string[];
  onStructureSelected: (structureId: string) => void;
  onClose: () => void;
}

export const StructureDiscoveryChat: React.FC<StructureDiscoveryChatProps> = ({
  sampleEntries,
  onStructureSelected,
  onClose,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showHybridBuilder, setShowHybridBuilder] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Start the conversation
    startConversation();
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startConversation = async () => {
    setIsLoading(true);
    try {
      const response = await structureDiscoveryApi.startConversation({
        sample_entries: sampleEntries,
        initial_preferences: {},
      });

      setConversationId(response.conversation_id);

      // Build initial message based on actual analysis
      let initialMessage =
        "Hi! I'm here to help you create the perfect knowledge structure for your journal. ";

      // Add insights from actual analysis if available
      if (
        response.analysis_insights?.actual_quotes &&
        response.analysis_insights.actual_quotes.length > 0
      ) {
        initialMessage += "I've analyzed your entries and noticed some patterns. ";

        // Show an actual quote
        const quote = response.analysis_insights.actual_quotes[0];
        initialMessage += `For example, you wrote: "${quote.text}"`;
      }

      // Add initial message
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: initialMessage,
        },
        {
          id: '2',
          role: 'assistant',
          content: response.current_question,
          suggestions: response.suggestions.length > 0 ? response.suggestions : undefined,
          quickReplies: [
            'I want to track projects and tasks',
            "I'm interested in building a network of ideas",
            'I want to track people and relationships',
            'I want a mix of different structures',
            'I need something custom',
            'Tell me more about these options',
          ],
        },
      ]);
    } catch (error) {
      console.error('Error starting conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (!conversationId) return;

    // Check if user wants hybrid structure
    if (
      content.toLowerCase().includes('mix') ||
      content.toLowerCase().includes('hybrid') ||
      content.toLowerCase().includes('combine')
    ) {
      setShowHybridBuilder(true);
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call the conversation continue API
      const response = await structureDiscoveryApi.continueConversation({
        conversation_id: conversationId,
        user_response: content,
      });

      // Add bot response
      const assistantResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.current_question,
        suggestions: response.suggestions.length > 0 ? response.suggestions : undefined,
        quickReplies:
          response.analysis_insights?.stage === 'custom_entities'
            ? [
                'People and relationships',
                'Projects and tasks',
                'Ideas and insights',
                'Learning and growth',
                'Events and experiences',
                'Health and wellness',
              ]
            : response.analysis_insights?.stage === 'custom_relationships'
              ? [
                  'Show me an example structure',
                  'Let me describe the connections',
                  "I'm ready to proceed",
                ]
              : response.analysis_insights?.stage === 'refinement'
                ? [
                    'Start with a template and customize',
                    'Build something completely custom',
                    'Show me hybrid examples',
                  ]
                : [],
      };

      setMessages((prev) => [...prev, assistantResponse]);
    } catch (error) {
      console.error('Error continuing conversation:', error);
      // Show error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          "I'm sorry, I encountered an error. Let me try a different approach. What specific aspects of your journal entries are most important to you?",
        quickReplies: ['Start over', 'Try again'],
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickReply = (reply: string) => {
    sendMessage(reply);
  };

  const selectStructure = (structureId: string) => {
    onStructureSelected(structureId);
  };

  const handleHybridComplete = async (hybridConfig: any) => {
    setIsLoading(true);
    try {
      // Create the hybrid structure via API
      const response = await structureDiscoveryApi.createHybridStructure(hybridConfig);

      // Show success message
      const successMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Great! I've created your personalized hybrid structure combining ${response.structures_combined} templates with ${response.entity_types_created} entity types. This unique structure will help you capture the diverse aspects of your journal entries.`,
      };
      setMessages((prev) => [...prev, successMessage]);

      // Mark as completed after a short delay
      setTimeout(() => {
        onStructureSelected('hybrid');
      }, 2000);
    } catch (error) {
      console.error('Error creating hybrid structure:', error);
    } finally {
      setIsLoading(false);
      setShowHybridBuilder(false);
    }
  };

  // Show hybrid builder if requested
  if (showHybridBuilder) {
    return (
      <HybridStructureBuilder
        onComplete={handleHybridComplete}
        onBack={() => setShowHybridBuilder(false)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-semibold">Discover Your Knowledge Structure</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ×
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
            )}

            <div className={`max-w-md ${message.role === 'user' ? 'order-first' : ''}`}>
              <div
                className={`rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                }`}
              >
                {message.content}
              </div>

              {/* Structure Suggestions */}
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.suggestions.map((suggestion) => (
                    <button
                      key={suggestion.structure_id}
                      onClick={() => selectStructure(suggestion.structure_id)}
                      className="w-full text-left p-3 bg-white dark:bg-gray-800 rounded-lg border 
                        border-gray-200 dark:border-gray-700 hover:border-purple-400 
                        dark:hover:border-purple-600 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {suggestion.name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {suggestion.description}
                          </p>
                        </div>
                        <ChevronRight
                          className="w-5 h-5 text-gray-400 group-hover:text-purple-600 
                          dark:group-hover:text-purple-400 transition-colors"
                        />
                      </div>
                      {suggestion.relevance_score > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Match</span>
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-purple-600 dark:bg-purple-400 h-2 rounded-full"
                                style={{ width: `${suggestion.relevance_score * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {Math.round(suggestion.relevance_score * 100)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Quick Replies */}
              {message.quickReplies && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.quickReplies.map((reply, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickReply(reply)}
                      className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 
                        text-gray-700 dark:text-gray-300 rounded-full 
                        hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t dark:border-gray-700 px-6 py-4 bg-white dark:bg-gray-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) {
              sendMessage(input);
            }
          }}
          className="flex gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your response..."
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg 
              focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg 
              hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed 
              transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
