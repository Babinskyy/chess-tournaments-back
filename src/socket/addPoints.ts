import { Player } from '../types/types.types';

export const addPoints = (
  activePlayers: Set<Player>,
  winner: string,
  game: string,
  activeGames: Map<any, any>
) => {
  if (winner) {
    if (winner !== 'draw') {
      activePlayers.forEach((user) => {
        if (user.username === winner) {
          user.points = user.points + 1;
        }
      });
    } else {
      const players = activeGames.get(game).players;
      activePlayers.forEach((user) => {
        if (user.username === players[0]) {
          user.points = user.points + 0.5;
        }
        if (user.username === players[1]) {
          user.points = user.points + 0.5;
        }
      });
    }
  } else {
    return;
  }
};
