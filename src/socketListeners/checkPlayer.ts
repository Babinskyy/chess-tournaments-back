import { allPlayers } from "../socket/onConnection";
import { findPlayerByUsername } from "../utils/findPlayerByUsername";

export const checkPlayer = (username: string, callback: Function) => {
  const player = findPlayerByUsername(username, allPlayers);

  if (!player?.isDeleted) {
    callback(true);
  } else {
    callback(false);
  }
};
