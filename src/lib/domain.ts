/** URL のホスト名（URL として読めなければ null） */
export function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

/** 入力からスキームとパスを外して小文字のドメインにし、先頭が *. かを返す */
export function parseDomainInput(input: string): {
  domain: string;
  isWildcard: boolean;
} {
  const trimmed = input.trim().toLowerCase();

  const domain = trimmed.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

  const isWildcard = domain.startsWith('*.');

  return { domain, isWildcard };
}

/** ドメインとして正しい形か（先頭の *. は許す。ラベルは 2 つ以上、TLD は英字のみ） */
export function isValidDomain(domain: string): boolean {
  const cleanDomain = domain.replace(/^\*\./, '');

  if (cleanDomain.length > 253) return false;

  const labels = cleanDomain.split('.');

  if (labels.length < 2) return false;

  const labelRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

  for (const label of labels) {
    if (label.length === 0 || label.length > 63) return false;
    if (!labelRegex.test(label)) return false;
  }

  const tld = labels[labels.length - 1];
  if (!/^[a-zA-Z]{2,}$/.test(tld)) return false;

  return true;
}

/** ランダムな 32 桁の 16 進文字列の ID */
export function generateId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  );
}
