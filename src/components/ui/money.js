export function money(n) {
  return '$' + Number(n || 0).toLocaleString();
}
