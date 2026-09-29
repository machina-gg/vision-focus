import React, { useState } from 'react';
import { Plus } from 'lucide-react';

import { Button, Card, Input } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import { AllowedSiteItem } from './AllowedSiteItem';
import type { AllowedSiteRow } from '~/lib/blockList';

/** AllowedSitesSection に渡す許可サイトの一覧・失敗の文言と操作 */
interface AllowedSitesSectionProps {
  /** 一覧に並べる許可サイト（並べる順のまま出す） */
  sites: AllowedSiteRow[];
  /** 直前の操作に失敗した理由（空なら出さない） */
  error: string;
  /** 追加ボタンが押されたときに入力を受け取る。失敗の文言、追加したら null を返す（null のときだけ入力を空にする） */
  onAdd: (input: string) => Promise<string | null>;
  /** 削除ボタンが押されたときにドメインを受け取る（確認は出さない） */
  onRemove: (domain: string) => void;
  /** 「時間を記録する」が切り替わったときに、ドメインと切り替え後の状態を受け取る（確認は出さない） */
  onSetRecording: (domain: string, recordTime: boolean) => void;
}

/**
 * 「許可サイト」節（説明・追加欄・一覧）をカードで表示する
 * @param props 許可サイトの一覧・失敗の文言と操作（各フィールドは AllowedSitesSectionProps）
 * @returns 許可サイトの節のカード
 */
export function AllowedSitesSection({
  sites,
  error,
  onAdd,
  onRemove,
  onSetRecording
}: AllowedSitesSectionProps) {
  const [input, setInput] = useState('');

  const handleAdd = async () => {
    if (!input.trim()) return;
    if ((await onAdd(input)) === null) setInput('');
  };

  return (
    <Card data-testid="allowed-sites-section">
      <h2 className="text-lg font-semibold text-gray-900">
        {getMessage('allowedSitesSection')}
      </h2>
      <p className="text-sm text-gray-500 mt-0.5 mb-4">
        {getMessage('allowedSitesDescription')}
      </p>
      <div className="flex gap-2">
        <Input
          data-testid="allowed-site-input"
          value={input}
          onChange={setInput}
          placeholder={getMessage('allowedSitePlaceholder')}
          containerClassName="flex-1 min-w-0"
          className="text-base py-2.5"
        />
        <Button
          data-testid="allowed-site-add-button"
          onClick={() => void handleAdd()}
          className="shrink-0"
        >
          <Plus className="w-4 h-4 mr-1" />
          {getMessage('add')}
        </Button>
      </div>
      {error && (
        <p
          className="mt-2 text-sm text-danger-600"
          data-testid="allowed-site-error"
        >
          {error}
        </p>
      )}
      {sites.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          {getMessage('noAllowedSites')}
        </p>
      ) : (
        <div className="mt-4 divide-y divide-gray-100">
          {sites.map((site) => (
            <AllowedSiteItem
              key={site.domain}
              site={site}
              onRemove={onRemove}
              onSetRecording={onSetRecording}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
