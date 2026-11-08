const gambling = /casino|cazino|superbet|maxbet|stanleybet|betano|unibet|betfair|efortuna|fortuna|admiral|888casino|winbet|winnerbet|getsbet|princesscasino|netbet|bet365|pokerstars|favbet|favic?bet|supercazino|casapariurilor|casapariurilorsportive|publicwin|luck|betmen|mozzart|efbet|magicjackpot|pacanele|păcănele|betting|sportingbet|888sport|888poker|vladcazino/i;
export function isGamblingLink(value: string) {
  try { const url = new URL(value); return gambling.test(url.hostname); } catch { return false; }
}
export function isGamblingPlace(name: string) {
  return /casino|cazino|pariuri|gambling|bookmaker|slot.?machine|sal[aă].*jocuri|superbet|maxbet|stanleybet|betano|fortuna|admiral|winbet|winnerbet|getsbet|netbet|favbet|cas[aă].*pariuri|publicwin|magic.?jackpot|pacanele|păcănele|efbet|mozzart/i.test(name);
}
