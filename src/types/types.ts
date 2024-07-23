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
  CHECK_TOURNAMENT = "check-tournament",
  UPDATE_TOURNAMENTS = "update-tournaments",
  GET_TOURNAMENTS = "get-tournaments",
  FINISH_TOURNAMENT = "finish-tournament",
  CHECK_IS_PLAYER_IN_TOURNAMENT = "check-is-player-in-tournament",
  UPDATE_CLOCK = "update-clock",
  START_ROUND = "start-round",
  UPDATE_ONE_TOURNAMENT = "update-one-tournament",
  UPDATE_COUNTDOWN = "update-countdown",
  DRAW_OFFER = "draw-offer",
  OFFER_DRAW = "offer-draw",
  DECLINE_DRAW = "decline-draw",
  ACCEPT_DRAW = "accept-draw",
  DRAW_DECLINED = "draw-declined",
}

export enum PlayerStatus {
  NOT_STARTED = "notStarted",
  IN_GAME = "inGame",
  WAITING = "waiting",
  SPECTATOR = "spectator",
  DISCONNECTED = "disconnected",
}

export type Player = {
  id: string;
  username: string;
  points: number;
  status: PlayerStatus;
  isAdmin: boolean;
  isDeleted: boolean;
  playersPlayed: string[];
  colors: Array<Color>;
};

export type Tournament = {
  id: string;
  name: string;
  players: Player[];
  active: boolean;
  type: TournamentType;
  time: number;
  increment: number;
  win: number;
  currentRound: number;
};

export type Game = {
  fen: string;
  playersUsernames: string[];
  clocks: [number, number];
  isWhiteMove: boolean;
  spectators: string[];
  history: string[];
};

export enum TemporaryPlayer {
  ID = "00000000000000",
}

export enum Color {
  WHITE = "white",
  BLACK = "black",
}

export enum TournamentType {
  FFA = "ffa",
  SWISS = "swiss",
  BRACKETS = "brackets",
}

export type moveData = {
  from: string;
  to: string;
  promotion: string;
};

export enum GameFinishReason {
  time = "opponent time",
  checkmate = "checkmate",
  surrender = "opponent surrender",
  threefold = "threefold repetition",
  stalemate = "stalemate",
  material = "insufficient material",
  tournamentFinish = "finish tournament",
  opponentDisconnect = "opponent disconnect",
  drawAgreement = "players agreement",
}
