import { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  GameState, 
  Message, 
  GameAction, 
  Persona, 
  GAME_CONFIG,
  PollingsMessage,
  UiState,
  Action,
} from '@/types';
import { fetchFromPollinations } from '@/utils/api';
import { getPersonaPrompt } from '@/prompts';

// Core message management hook
export const useMessages = () => {
  const [messages, setMessages] = useState<Message[]>([]);

  const addMessage = useCallback((message: Message) => {
    setMessages(appendIfNotDuplicate(message));
  }, []);

  return { messages, addMessage };
};

// append only if the last message is not the same
const appendIfNotDuplicate = (message: Message) => {
    return (messages: Message[]) => {
        const stringifiedMessage = JSON.stringify(message);
        const lastMessage = JSON.stringify(messages[messages.length - 1]);
        return lastMessage !== stringifiedMessage ? [...messages, message] : messages;
    }
};

// Pure function to compute game state from messages
export const computeGameState = (messages: Message[]): GameState => {
  const initialState: GameState = {
    currentFloor: GAME_CONFIG.INITIAL_FLOOR,
    movesLeft: GAME_CONFIG.TOTAL_MOVES - messages.filter(m => m.persona === 'user').length,
    currentPersona: 'elevator',
    firstStageComplete: false,
    hasWon: false,
    conversationMode: 'user-interactive',
    lastSpeaker: null,
    marvinJoined: false
  };

  return messages.reduce<GameState>((state, msg) => {
    const nextState = { ...state };

    if (msg.persona === 'guide' && msg.message === GAME_CONFIG.MARVIN_TRANSITION_MSG) {
      nextState.currentPersona = 'marvin' as const;
    }

    switch (msg.action) {
      case 'join':
        return {
          ...nextState,
          conversationMode: 'autonomous' as const,
          lastSpeaker: 'marvin',
          marvinJoined: true
        };
      case 'up': {
        const newFloor = Math.min(GAME_CONFIG.FLOORS, state.currentFloor + 1);
        return {
          ...nextState,
          currentFloor: newFloor,
          hasWon: state.marvinJoined && newFloor === GAME_CONFIG.FLOORS
        };
      }
      case 'down': {
        const newFloor = Math.max(1, state.currentFloor - 1);
        return {
          ...nextState,
          currentFloor: newFloor,
          firstStageComplete: newFloor === 1
        };
      }
      default:
        return nextState;
    }
  }, initialState);
};

const safeJsonParse = (data: string): { message: string; action?: Action } => {
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error('JSON parse error:', error);
    return { message: data };
  }
};

const isValidFloor = (floor: number): floor is 1 | 2 | 3 | 4 | 5 => {
  return floor >= 1 && floor <= 5;
};

export const fetchPersonaMessage = async (
  persona: Persona, 
  floor: number,
  existingMessages: Message[] = [],
): Promise<Message> => {
  try {
    if (!isValidFloor(floor)) {
      throw new Error(`Invalid floor number: ${floor}`);
    }

    const messages: PollingsMessage[] = [
      {
        role: 'system' as const,
        content: getPersonaPrompt(persona, floor)
      },
      ...existingMessages.map(msg => ({
        role: (msg.persona === 'user' ? 'user' : 'assistant') as const,
        content: JSON.stringify({ message: msg.message, action: msg.action }),
        ...(msg.persona !== 'user' && { name: msg.persona })
      }))
    ];

    const data = await fetchFromPollinations(messages);
    const response = safeJsonParse(data.choices[0].message.content);
    
    return { 
      persona, 
      message: typeof response === 'string' ? response : response.message,
      action: typeof response === 'string' ? 'none' : (response.action || 'none')
    };
  } catch (error) {
    console.error('Error:', error);
    return { persona, message: "Apologies, I'm experiencing some difficulties.", action: 'none' };
  }
};

// Game state management hook
export const useGameState = (messages: Message[]) => {
  return useMemo(() => computeGameState(messages), [messages]);
};

// Effect hook for guide messages
export const useGuideMessages = (
  gameState: GameState, 
  messages: Message[], 
  addMessage: (message: Message) => void
) => {
    const lastMessage = messages[messages.length - 1];

    // marvin joined 
    useEffect(() => {
        if (lastMessage?.action === 'join') {
            addMessage({
                persona: 'guide',
                message: 'Marvin has joined the elevator. Now sit back and watch the fascinating interaction between these two Genuine People Personalities™...',
                action: 'none'
            });
        }
    }, [lastMessage, addMessage]);

    // floor changed
    useEffect(() => {
        addMessage({
            persona: 'guide',
            message: `Now arriving at floor ${gameState.currentFloor}...`,
            action: 'none'
        });
    }, [gameState.currentFloor, addMessage]);
};

// Autonomous conversation hook
export const useAutonomousConversation = (
  gameState: GameState,
  messages: Message[],
  addMessage: (message: Message) => void
) => {
  useEffect(() => {
    if (gameState.conversationMode !== 'autonomous' || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    const nextSpeaker = lastMessage.persona === 'marvin' ? 'elevator' : 'marvin';
    const delay = 1000 + (messages.length * 500);

    const timer = setTimeout(async () => {
      const response = await fetchPersonaMessage(
        nextSpeaker,
        gameState.currentFloor,
        messages
      );
      addMessage(response);
    }, delay);

    return () => clearTimeout(timer);
  }, [messages, gameState.conversationMode, gameState.currentFloor, addMessage]);
};

export const useMessageHandlers = (
  gameState: GameState,
  messages: Message[],
  uiState: UiState,
  setUiState: React.Dispatch<React.SetStateAction<UiState>>,
  addMessage: (message: Message) => void
) => {
  const handleGuideAdvice = useCallback(async () => {
    if (uiState.isLoading) return;
    
    setUiState((prev: UiState) => ({ ...prev, isLoading: true }));
    try {
      const response = await fetchPersonaMessage('guide', gameState.currentFloor, messages);
      addMessage(response);
    } finally {
      setUiState((prev: UiState) => ({ ...prev, isLoading: false }));
    }
  }, [gameState.currentFloor, messages, uiState.isLoading, setUiState, addMessage]);

  const handlePersonaSwitch = useCallback(() => {
    addMessage({
      persona: 'guide',
      message: GAME_CONFIG.MARVIN_TRANSITION_MSG,
      action: 'none'
    });
  }, [addMessage]);

  return {
    handleGuideAdvice,
    handlePersonaSwitch
  };
};
