import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function matchesEmployee(idA?: any, idB?: any): boolean {
  if (idA === undefined || idB === undefined || idA === null || idB === null) return false;
  if (idA === idB) return true;
  const strA = String(idA).trim();
  const strB = String(idB).trim();
  if (strA === strB) return true;
  if (strA.toLowerCase() === strB.toLowerCase()) return true;
  const numA = Number(strA.replace(/\D/g, ""));
  const numB = Number(strB.replace(/\D/g, ""));
  if (numA && numB && numA === numB) return true;
  return false;
}
