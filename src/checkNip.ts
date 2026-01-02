/**
 * Typ danych zwracanych przez API MF (uproszczony)
 */
export interface NipResult {
  nip: string;
  nazwa: string;
  statusVat: string;
  regon: string | null;
  adres: string;
  konta: string[];
}

/**
 * Sprawdza poprawność sumy kontrolnej NIP
 */
export function isValidNip(nip: string): boolean {
  const cleaned = nip.replace(/[^0-9]/g, "");

  if (cleaned.length !== 10) return false;

  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const digits = cleaned.split("").map(Number);

  // jeśli którakolwiek z cyfr jest NaN - niepoprawny
  if (digits.some(d => Number.isNaN(d))) return false;

  const sum = weights.reduce((acc, w, i) => acc + w * digits[i], 0) % 11;

  // suma może być 0..10 - jeżeli 10 -> niepoprawny
  return sum === digits[9];
}

/**
 * Główna funkcja sprawdzająca NIP w Białej Liście VAT
 * opcjonalny parametr `agent` może być przekazany, żeby użyć proxya
 */
import fetch from 'node-fetch';

export async function checkNip(nip: string, agent?: any): Promise<NipResult> {
  if (!isValidNip(nip)) {
    throw new Error("Niepoprawny numer NIP");
  }

  const date = new Date().toISOString().split("T")[0];
  const url = `https://wl-api.mf.gov.pl/api/search/nip/${nip}?date=${date}`;

  const response = await fetch(url, agent ? { agent } : undefined as any);

  if (!response.ok) {
    throw new Error("Błąd połączenia z API MF");
  }

  const data: any = await response.json();
  const subject = data?.result?.subject;

  if (!subject) {
    throw new Error("Firma nie znaleziona");
  }

  return {
    nip: subject.nip,
    nazwa: subject.name,
    statusVat: subject.statusVat,
    regon: subject.regon ?? null,
    adres: subject.workingAddress,
    konta: subject.accountNumbers ?? []
  };
}
