import React, { useState, useEffect } from 'react';

import { Shield } from 'lucide-react';

import { Button, Input } from '~/components/ui';
import { getMessage } from '~/lib/i18n';

/** QuickBlockButton に渡す初期値とブロックの受け取り先 */
export interface QuickBlockButtonProps {
  /** 入力欄にあらかじめ入れるドメイン（変わるたびに入れ直す） */
  currentDomain?: string;
  /** ブロックボタンか Enter で、前後の空白を除いたドメインを受け取る（空なら呼ばない） */
  onBlock: (domain: string) => void;
  /** true なら入力もブロックもできなくする */
  disabled?: boolean;
}

/**
 * ドメインを入力してすぐブロック対象に加える欄を表示する
 * @param props 初期値とブロックの受け取り先（各フィールドは QuickBlockButtonProps）
 * @returns 見出し・入力欄・ブロックボタンをまとめた要素
 */
export function QuickBlockButton({
  currentDomain,
  onBlock,
  disabled = false
}: QuickBlockButtonProps) {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (currentDomain) {
      setInputValue(currentDomain);
    }
  }, [currentDomain]);

  const handleBlock = () => {
    const domain = inputValue.trim();
    if (domain) {
      onBlock(domain);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlock();
    }
  };

  return (
    <div className="space-y-3">
      <h2
        className="text-sm font-semibold text-gray-700"
        data-testid="quick-block-heading"
      >
        {getMessage('blockWebsites')}
      </h2>
      <div className="flex gap-2">
        <Input
          data-testid="quick-block-input"
          value={inputValue}
          onChange={setInputValue}
          onKeyDown={handleKeyDown}
          placeholder={getMessage('domainPlaceholder')}
          containerClassName="flex-1 min-w-0"
          className="text-base py-2.5"
          disabled={disabled}
        />
        <Button
          data-testid="quick-block-button"
          onClick={handleBlock}
          disabled={disabled || !inputValue.trim()}
          className="shrink-0 px-4 py-2.5"
        >
          <Shield className="w-4 h-4" />
          {getMessage('block')}
        </Button>
      </div>
    </div>
  );
}
