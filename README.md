# ruchablenip
 Ruchanie NIPow pozdro

## Success rate
```
Attempts: 2202
Found: 6
Success: 0.27%
Elapsed: 190s
Rate/min: 695.3
```

## CLI

Uruchomienie CLI (po zbudowaniu):

```bash
pnpm run build
pnpm run cli -- --attempts 1000 --delay 200 --report 10 --concurrency 5 --use-proxies
```

Opcje:
- `--attempts N` - zakończ po N próbach
- `--delay ms` - opóźnienie między próbami w ms (domyślnie 300)
- `--report N` - wypisuj podsumowanie co N prób
- `--concurrency N` - liczba równoległych zadań (domyślnie 5)
- `--use-proxies` - włącz użycie listy proxy (domyślnie wyłączone)
- `--proxy-url URL` - URL do listy proxy (domyślnie `https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/http.txt`)

Kolory: CLI używa prostych kolorów ANSI do wyróżnienia komunikatów (zielone = znaleziono, cyjan = informacje).

Proxy: lista proxy jest pobierana z powyższego URL i filtrowana (linia musi mieć format `host:port`). Proxy są używane cyklicznie dla zapytań.

Telegram: konfiguracja jest umieszczona w `src/config.ts` — uzupełnij `tgToken` oraz `tgChat`, a CLI automatycznie będzie wysyłać powiadomienia przy każdym znalezieniu oraz podsumowanie po zakończeniu.

