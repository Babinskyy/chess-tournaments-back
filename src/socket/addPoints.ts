import { User } from './onConnection';

export const addPoints = (
  activeUsers: Set<User>,
  winner: string,
  game: string,
  activeGames: Map<any, any>
) => {
  if (winner !== 'draw') {
    activeUsers.forEach((user) => {
      if (user.username === winner) {
        user.points = user.points + 1;
      }
    });
  } else {
    const players = activeGames.get(game).players;
    activeUsers.forEach((user) => {
      if (user.username === players[0]) {
        user.points = user.points + 0.5;
      }
      if (user.username === players[1]) {
        user.points = user.points + 0.5;
      }
    });
  }
};
