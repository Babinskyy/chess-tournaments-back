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
  CHECK_PLAYER = "check-player",
  PLAYER_JOIN = "player-join",
  SET_GAME = "set-game",
  USER_ID = "user-id",
  USERS_LIST_UPDATE = "users-list-update",
  PLAYER_MOVE = "player-move",
  RECOVER_GAME = "recover-game",
  RECOVER_PLAYER = "recover-player",
  FINISH_GAME = "finish-game",
  TOURNAMENT_STARTED = "tournament-started",
  GET_TOURNAMENT_INFO = "get-tournament-info",
  CHECK_STATUS = "check-status",
  DELETE_TOURNAMENT = "delete-tournament",
  TOURNAMENT_DELETED = "tournament-deleted",
  LEAVE_TOURNAMENT = "leave-tournament",
}

export enum PlayerStatus {
  NOT_STARTED = "notStarted",
  IN_GAME = "inGame",
  WAITING = "waiting",
  SPECTATOR = "spectator",
  DISCONNECTED = "disconnected",
}

export type User = {
  id: string;
  username: string;
  points: number;
  status: PlayerStatus;
  isAdmin: boolean;
  isDeleted: boolean;
};

export type Tournament = {
  id: string;
  name: string;
  playersUsernames: string[];
  active: boolean;
};

export type Game = {
  fen: string;
  playersUsernames: string[];
  clocks: [number, number];
  spectators: string[];
};

export enum TemporaryPlayer {
  ID = "00000000000000",
}
