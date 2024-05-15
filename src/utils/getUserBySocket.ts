import { User } from "../types/types.types";

export const getUserBySocket = (
  socketId: string,
  activeUsers: Set<User>
) => {
    return Array.from(activeUsers).find((u) => u.id === socketId);
};
