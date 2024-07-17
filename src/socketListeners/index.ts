// index.ts

import { userLogin } from "./userLogin";
import { userEnteredLobby } from "./userEnteredLobby";
import { userLogout } from "./userLogout";
import { userDisconnect } from "./userDisconnect";
import { moveEvent } from "./moveEvent";
import { joinGame } from "./joinGame";
import { updateGame } from "./updateGame";
import { gameEnd } from "./gameEnd";
import { createTournament } from "./createTournament";
import { enterTournament } from "./enterTournament";
import { startTournament } from "./startTournament";
import { spectatorJoin } from "./spectatorJoin";
import { stopSpectating } from "./stopSpectating";
import { cancelGameSearch } from "./cancelGameSearch";
import { checkPlayer } from "./checkPlayer";
import { getTournamentInfo } from "./getTournamentInfo";
import { deleteTournament } from "./deleteTournament";
import { leaveTournament } from "./leaveTournament";
import { checkTournament } from "./checkTournament";
import { checkIsPlayerInTournament } from "./checkIsPlayerInTournament";
import { startRound } from "./startRound";

const functions = {
  userLogin,
  userEnteredLobby,
  userLogout,
  userDisconnect,
  moveEvent,
  joinGame,
  updateGame,
  gameEnd,
  createTournament,
  enterTournament,
  startTournament,
  spectatorJoin,
  stopSpectating,
  cancelGameSearch,
  checkPlayer,
  getTournamentInfo,
  deleteTournament,
  leaveTournament,
  checkTournament,
  checkIsPlayerInTournament,
  startRound,
};

export default functions;
