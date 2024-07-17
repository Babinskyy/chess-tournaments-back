import { activeGames } from "../socket/onConnection";

export const updateGame = (room: string, currentPosition: string) => {
  if (activeGames.has(room)) {
    const activeGame = activeGames.get(room)!;
    activeGame.fen = currentPosition;
  } else {
    console.error(`Game with ID ${room} not found.`);
  }
};
