import { User } from '../socket/onConnection';

export const getUsersArray = (activeUsers: Set<User>) => Array.from(activeUsers);