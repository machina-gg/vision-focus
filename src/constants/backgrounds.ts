import { getExtensionURL } from '~/lib/chromeApi';

/** 同梱の背景画像の選択肢（id は画像のファイル名、name は画面に出す名前） */
export const BACKGROUND_OPTIONS = [
  { id: 'default-1', name: 'Sky1' },
  { id: 'default-2', name: 'Sky2' },
  { id: 'default-3', name: 'Mountain1' },
  { id: 'default-4', name: 'Mountain2' },
  { id: 'default-5', name: 'Ocean' },
  { id: 'monday', name: 'Monday' },
  { id: 'tuesday', name: 'Tuesday' },
  { id: 'wednesday', name: 'Wednesday' },
  { id: 'thursday', name: 'Thursday' },
  { id: 'friday', name: 'Friday' },
  { id: 'saturday', name: 'Saturday' },
  { id: 'sunday', name: 'Sunday' }
] as const;

/**
 * 同梱の背景画像の拡張内の URL を返す
 * @param bgId BACKGROUND_OPTIONS の id
 * @returns assets/images/backgrounds/ 配下の webp の URL
 */
export function getBackgroundUrl(bgId: string): string {
  return getExtensionURL(`assets/images/backgrounds/${bgId}.webp`);
}
