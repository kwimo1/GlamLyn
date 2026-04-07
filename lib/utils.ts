import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function toSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

export function generateId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}
