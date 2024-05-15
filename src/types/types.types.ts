export enum SocketEvent {
  USER_LOGIN = "user-login",
  USER_ENTERED_LOBBY = "user-entered-lobby",
  USER_RECONNECT = "user-reconnect",
  USER_LOGOUT = "user-logout",
  DISCONNECT = "disconnect",
  MOVE = "move",
  JOIN_GAME = "join-game",
  UPDATE_GAME = "update-game",
  GAME_STARTED = "game-started",
  GAME_END = "game-end",
  CREATE_TOURNAMENT = "create-tournament",
  ENTER_TOURNAMENT = "enter-tournament",
  START_TOURNAMENT = "start-tournament",
  SPECTATOR_JOIN = "spectator-join",
  STOP_SPECTATING = "stop-spectating",
  CANCEL_GAME_SEARCH = "cancel-game-search",
}

export enum PlayerStatus {
  NOT_STARTED = "notStarted",
  IN_GAME = "inGame",
  WAITING = "waiting",
  SPECTATOR = "spectator",
}

export type User = {
  id: string;
  username: string;
  points: number;
  status: PlayerStatus;
  isAdmin: boolean;
};

export type Tournament = {
  id: string;
  name: string;
  playersUsernames: string[];
};

export type Game = {
  fen: string;
  playersUsernames: string[];
  clocks: [number, number];
  spectators: string[];
};
