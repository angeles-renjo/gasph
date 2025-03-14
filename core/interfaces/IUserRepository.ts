import { User } from '../models/User';
import { IRepository } from './IRepository';

export interface IUserRepository extends IRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  updatePreferences(
    userId: string,
    preferences: Partial<User['preferences']>
  ): Promise<User>;
  addFavoriteStation(userId: string, stationId: string): Promise<User>;
  removeFavoriteStation(userId: string, stationId: string): Promise<User>;
}
