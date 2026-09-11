import { findProfileByUserId, listGoals } from "./repository";

export async function getProfile(userId: string) {
  return findProfileByUserId(userId);
}

export async function getGoals(userId: string) {
  return listGoals(userId);
}
