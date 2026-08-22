/** Centralized Socket.IO event names — never hand-type an event string. */
export const EVENTS = {
  // room
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_READY: 'room:ready',
  ROOM_START: 'room:start',
  ROOM_REPLAY: 'room:replay',
  ROOM_STATE: 'room:state',
  PLAYER_CONNECTION: 'room:playerConnection',

  // chat
  CHAT_SEND: 'chat:send',
  CHAT_MESSAGE: 'chat:message',

  // game selection / lifecycle
  GAME_CATALOG: 'game:catalog',
  GAME_SELECT: 'game:select',
  GAME_START: 'game:start',
  GAME_STATE: 'game:state',
  GAME_PRIVATE: 'game:private',
  GAME_FINISHED: 'game:finished',
  GAME_NEXT: 'game:next',
  FINAL_RESULT: 'game:finalResult',

  // rounds / turns
  ROUND_STARTED: 'round:started',
  TURN_STARTED: 'round:turnStarted',
  ROUND_FINISHED: 'round:finished',
  TIME_EXPIRED: 'round:timeExpired',

  // answers / scoring
  ANSWER_SUBMIT: 'answer:submit',
  ANSWER_RESULT: 'answer:result',
  SCORE_UPDATE: 'score:update',

  // drawing
  DRAWING_STROKE: 'drawing:stroke',
  DRAWING_UNDO: 'drawing:undo',
  DRAWING_CLEAR: 'drawing:clear',
  DRAWING_WORDS_SUBMIT: 'drawing:wordsSubmit',

  // outfit (photo dress-up)
  PHOTO_SUBMIT: 'photo:submit',

  // misc
  ERROR: 'error',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
