import { Player } from '../types/types.types';

export const getUsernamesForActiveSockets = (
  activePlayers: Set<Player>,
  activeSocketIds: Set<string> | undefined
): string[] => {
  const usernames: string[] = [];

  activeSocketIds?.forEach((socketId) => {
    const user = Array.from(activePlayers).find((u) => u.id === socketId);

    if (user) {
      usernames.push(user.username);
    }
  });

  return usernames;
};
