export interface Config {
  attempts?: number; // undefined => run until interrupted
  delayMs: number;
  reportEvery: number;
  concurrency: number;
  useProxies: boolean;
  proxyUrl: string;
  tgToken?: string; // Telegram bot token
  tgChat?: string; // Telegram chat id
}

export const config: Config = {
  // default settings - edit this file to change behavior
  attempts: undefined,
  delayMs: 300,
  reportEvery: 10,
  concurrency: 5,
  useProxies: false,
  proxyUrl: "https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/http.txt",

  // For automatic Telegram sending, provide these values
  // tgToken: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
  // tgChat: "-1001234567890",
};
