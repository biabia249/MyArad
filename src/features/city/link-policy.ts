const gambling = /casino|cazino|superbet|maxbet|stanleybet|betano|unibet|betfair|efortuna|fortuna|admiral|888casino|winbet|winnerbet|getsbet|princesscasino|netbet|bet365|pokerstars|favic?bet/i;
export function isGamblingLink(value: string) {
  try { const url = new URL(value); return gambling.test(url.hostname); } catch { return false; }
}
export function isGamblingPlace(name: string) {
  return /casino|cazino|pariuri|gambling|bookmaker|slot.?machine|sal[aă].*jocuri|superbet|maxbet|stanleybet|betano/i.test(name);
}
