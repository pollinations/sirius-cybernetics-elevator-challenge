'use client'

import React, { useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { AlertCircle } from 'lucide-react'
import { MessageDisplay } from '@/components/MessageDisplay'
import { ElevatorAscii } from '@/components/ElevatorAscii'
import { 
  useGameState, 
  useMessageHandlers,  
  useGuideMessages,
  useAutonomousConversation,
  useMessages,
  fetchPersonaMessage
} from '@/game/logic'

import {
  useMessageScroll,
  useInput,
  useUiState
} from '@/hooks/ui'

import { GargleBlaster } from '@/components/GargleBlaster';
import { Message } from '@/types'

export default function Index() {
  const { messages, addMessage, setMessages } = useMessages();
  const gameState = useGameState(messages);
  const [uiState, setUiState] = useUiState({
    input: '',
    isLoading: false,
    showInstruction: true
  });

  useGuideMessages(gameState, messages, addMessage);
  useAutonomousConversation(gameState, messages, addMessage);

  // Message handlers
  const handleMessage = async (message: string) => {
    if (!message.trim() || gameState.movesLeft <= 0) return;
    
    setUiState(prev => ({ ...prev, isLoading: true, showInstruction: false, input: '' }));

    try {
      const userMessage: Message = { persona: 'user', message, action: 'none' };
      addMessage(userMessage);

      const response = await fetchPersonaMessage(
        gameState.currentPersona, 
        gameState,
        [...messages, userMessage]
      );
      
      addMessage(response);
    } finally {
      setUiState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const messagesEndRef = useMessageScroll(messages);
  const { inputRef } = useInput(uiState.isLoading);
  const { 
    handleGuideAdvice, 
    handlePersonaSwitch 
  } = useMessageHandlers(
    gameState,
    messages,
    uiState,
    setUiState,
    addMessage,
    setMessages
  );

  useEffect(() => {
    if (gameState.firstStageComplete && gameState.currentPersona === 'elevator') {
      setUiState(prev => ({ ...prev, showInstruction: true }));
    }
  }, [gameState.firstStageComplete, gameState.currentPersona, setUiState]);

  const getInstructionMessage = () => {
    if (gameState.hasWon) return null;
    
    if (gameState.conversationMode === 'autonomous') {
      return (
        <div className="bg-blue-900 text-blue-200 p-4 rounded-lg space-y-3">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5" />
          <div>
            <p>The conversation is now autonomous. Don't panic! This is perfectly normal behavior for Sirius Cybernetics products.</p>
            <p>Sit back and watch the fascinating interaction between these two Genuine People Personalities™...</p>
          </div>
        </div>
      </div>
      );
    }

    if (gameState.currentPersona === 'marvin' && !gameState.marvinJoined) {
      return (
        <div className="bg-pink-900/50 text-pink-200 p-4 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5" />
          <p>New challenge: First convince Marvin the Paranoid Android to join you in the elevator, then together reach the top floor! 
          Warning: Marvin's pessimism might affect the elevator's behavior...</p>
        </div>
      );
    }

    // Only show initial instruction if we're at the start (messages.length <= 1)
    if (messages.length <= 1) {
      return (
        <div className="bg-blue-900 text-blue-200 p-4 rounded-lg space-y-3">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5" />
            <div>
              <p>Psst! Your mission: Convince this neurotic elevator to reach the ground floor. Remember your towel!</p>
              {uiState.showInstruction && gameState.currentPersona === 'elevator' && !gameState.firstStageComplete && (
                <p className="text-yellow-200 font-bold border-t border-blue-700 mt-3 pt-3">
                  <strong>Sub-etha News Flash:</strong> New Genuine People Personalities™ scenarios detected in building mainframe. Prepare for Marvin!
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-green-400 p-4 font-mono">
      <Card className="w-full max-w-2xl p-6 space-y-6 bg-gray-900 border-green-400 border-2 rounded-none">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-yellow-400 animate-pulse">
            <a href="https://websim.ai/c/FAflFDzXEC1ABzFvz" target="_blank" rel="noopener noreferrer">
              Sirius Cybernetics Corporation
            </a>
          </h1>
          <h2 className="text-xl font-semibold text-green-400">Happy Vertical People Transporter</h2>
          
          {/* Add moves remaining display */}
          {messages.length > 0 && (
            <div className="text-sm text-yellow-400">
              Moves Remaining: {gameState.movesLeft}
            </div>
          )}
          
          {getInstructionMessage()}

          <Button
            onClick={gameState.conversationMode === 'autonomous' ? 
              handlePersonaSwitch : 
              handleGuideAdvice}
            disabled={uiState.isLoading}
            className={`${
              gameState.conversationMode === 'autonomous' ? 
              'bg-yellow-600 hover:bg-yellow-700 text-white' : 
              'bg-gray-700 text-green-400 hover:bg-gray-600'
            } text-xs py-1 px-2`}
          >
            {gameState.conversationMode === 'autonomous' ? 'Rewind Time' : "Don't Panic!"}
          </Button>
        </div>
        

            {uiState.showInstruction && gameState.currentPersona === 'elevator' && gameState.firstStageComplete && (
              <div className="bg-green-900 text-green-200 p-4 rounded-lg flex items-center space-x-2">
                <AlertCircle className="w-5 h-5" />
                <p>
                  <strong>Congratulations!</strong> You've successfully navigated the neurotic elevator to the ground floor.
                  <br /><br />
                  Now, brace yourself for the next challenge: <em>Marvin the Paranoid Android</em> awaits.
                  <br /><br />
                  <Button
                    onClick={handlePersonaSwitch}
                    disabled={uiState.isLoading}
                    className="bg-green-400 text-black hover:bg-green-500 text-xs py-1 px-2"
                  >
                    Confirm
                  </Button>
                </p>
              </div>
            )}

            {(gameState.currentPersona === 'elevator' || gameState.currentPersona === 'marvin') && !gameState.hasWon && (
              <pre className="text-green-400 text-center">
                {ElevatorAscii({
                  floor: gameState.currentFloor,
                  showLegend: uiState.showInstruction,
                  isMarvinMode: gameState.currentPersona === 'marvin',
                  hasMarvinJoined: gameState.marvinJoined
                })}
              </pre>
            )}
        {messages.length > 1 && (
          <> {gameState.hasWon && (
              <div className="space-y-4">
                <div className="bg-green-900 text-green-200 p-4 rounded-lg text-center animate-bounce">
                  <p className="text-xl font-bold">So Long, and Thanks for All the Fish!</p>
                  <p>You've successfully convinced Marvin to join you and reached the top floor together. 
                  Even if Marvin thinks it was all pointless, you've done a remarkable job!</p>
                </div>
                <GargleBlaster />
              </div>
            )}

            {!gameState.hasWon && gameState.movesLeft <= 0 && (
              <div className="bg-red-900 text-red-200 p-4 rounded-lg text-center animate-bounce">
                <p className="text-xl font-bold">Mostly Harmless</p>
                <p>You've run out of moves. Time to consult your copy of the Hitchhiker's Guide to the Galaxy!</p>
              </div>
            )}

            <div className="h-64 overflow-y-auto space-y-2 p-2 bg-gray-800 border border-green-400">
              {messages.map((msg, index) => (
                <MessageDisplay 
                  key={index} 
                  msg={msg} 
                  gameState={gameState} 
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {gameState.conversationMode === 'user-interactive' && (
              <div className="flex space-x-2">
                <Input
                  type="text"
                  value={uiState.input}
                  onChange={(e) => setUiState(prev => ({ ...prev, input: e.target.value }))}
                  placeholder={gameState.currentPersona === 'elevator' ? "Communicate with the elevator..." : "Try to convince Marvin..."}
                  onKeyPress={(e) => e.key === 'Enter' && handleMessage(uiState.input)}
                  className="flex-grow bg-gray-800 text-green-400 border-green-400 placeholder-green-600"
                  ref={inputRef}
                  // Add disabled condition
                  disabled={uiState.isLoading || (gameState.currentPersona === 'elevator' && gameState.firstStageComplete)}
                />
                <Button 
                  onClick={() => handleMessage(uiState.input)} 
                  className="bg-green-400 text-black hover:bg-green-500"
                  // Add disabled condition
                  disabled={uiState.isLoading || (gameState.currentPersona === 'elevator' && gameState.firstStageComplete)}
                >
                  {uiState.isLoading ? 'Processing...' : 'Send'}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
      
      {/* Attribution text moved outside the Card */}
      <div className="text-center text-green-400 mt-4 text-xs max-w-xl">
        <p>This journey is brought to you by the <a href="https://websim.ai/c/FAflFDzXEC1ABzFvz">Sirius Cybernetics Corporation</a>. For more galactic adventures, visit <a href="https://pollinations.ai" className="text-blue-400 underline">pollinations.ai</a>. Powered by <a href="https://mistral.ai/news/mistral-large-2407/" className="text-blue-400 underline">Mistral Large 2</a>, the Deep Thought of our times.</p>
      </div>
    </div>
  );
}
