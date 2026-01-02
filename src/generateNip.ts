/**
 * Generuje losowy numer NIP
 * Zgodnie z oryginalnym algorytmem: pierwsze 3 cyfry nie mogą być zerami,
 * a jeśli cyfra kontrolna obliczona jako (suma wag * cyfry) % 11 == 10,
 * generujemy cały zestaw ponownie.
 */
export function generateNip(): string {
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];

  while (true) {
    const digits: number[] = [];

    // pierwsze 3 cyfry różne od zera
    for (let i = 0; i < 3; i++) {
      digits.push(Math.floor(Math.random() * 9) + 1);
    }

    // kolejne 6 cyfr mogą być zerami
    for (let i = 3; i < 9; i++) {
      digits.push(Math.floor(Math.random() * 10));
    }

    // obliczamy cyfrę kontrolną
    const sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0);
    const controlDigit = sum % 11;

    // jeśli suma modulo 11 daje 10 - niepoprawna kombinacja, powtarzamy generowanie
    if (controlDigit === 10) continue;

    digits.push(controlDigit);
    return digits.join("");
  }
}
