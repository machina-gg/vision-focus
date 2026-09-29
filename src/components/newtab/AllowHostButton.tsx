import React, { useCallback, useState } from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';

import { getMessage } from '~/lib/i18n';
import type { SiteKey } from '~/types/site';

/** AllowHostButton に渡すホストと操作 */
interface AllowHostButtonProps {
  /** 許可サイトにするホストのサイトキー */
  host: SiteKey;
  /** ボタンが押されたときに呼ぶ。成功なら null、失敗なら画面に出す文言を返す */
  onAllow: () => Promise<string | null>;
}

/**
 * ブロック画面の帯で、ブロックされたホストを確認なしで許可サイトにするボタン。成功したらそのホストを開くリンクに替わる
 * @param props ホストと操作（各フィールドは AllowHostButtonProps）
 * @returns ボタン・成功の文言とリンク・失敗の文言のいずれかを出す要素
 */
export function AllowHostButton({ host, onAllow }: AllowHostButtonProps) {
  const [isSending, setIsSending] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState('');

  const handleClick = useCallback(async () => {
    setIsSending(true);
    setError('');
    const failure = await onAllow();
    setIsSending(false);
    if (failure !== null) {
      setError(failure);
      return;
    }
    setIsDone(true);
  }, [onAllow]);

  if (isDone) {
    return (
      <p
        className="flex items-center gap-2 text-sm text-white"
        data-testid="newtab-allow-host-done"
      >
        <ShieldCheck className="w-4 h-4 text-success-400" />
        {getMessage('allowHostDone', host)}
        <a
          href={`https://${host}/`}
          className="inline-flex items-center gap-1 underline hover:text-white/80"
          data-testid="newtab-allow-host-open"
        >
          {getMessage('openAllowedHost')}
          <ExternalLink className="w-3 h-3" />
        </a>
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isSending}
        className="px-3 py-1.5 bg-white/20 hover:bg-white/30 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
        data-testid="newtab-allow-host-button"
      >
        {getMessage('allowHost', host)}
      </button>
      {error && (
        <p
          className="text-sm text-danger-200"
          role="alert"
          data-testid="newtab-allow-host-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}
