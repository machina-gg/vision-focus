/**
 * YouTubeBlockService - YouTube 固有の定数
 *
 * YouTube のブロック判定（アクセスブロック・時間制限）は `blockService` が
 * youtube.com のサイトキーに組み立てて、他のサイトと同じ `evaluateBlock` に通す。
 * ここには判定を置かない（置くと判定が 2 箇所になる）。
 */

/** YouTube のサイトキー。滞在時間・ブロック設定・時間制限の使用量はこのキーで引く */
export const YOUTUBE_DOMAIN = 'youtube.com';
