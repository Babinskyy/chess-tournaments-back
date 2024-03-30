import { User } from '../types/types.types';

export const getUsersArray = (activeUsers: Set<User>) =>
  Array.from(activeUsers);
