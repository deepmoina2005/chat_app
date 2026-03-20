import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";
