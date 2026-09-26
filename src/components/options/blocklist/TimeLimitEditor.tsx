import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Clock, ChevronDown, ChevronUp, Check } from 'lucide-react';

import { Select, Button } from '~/components/ui';
import { TimeLimitBadge } from '~/components/features';
import { getMessage } from '~/lib/i18n';
import { TIME_LIMIT_CONFIG, roundToNearestPreset } from '~/constants/limits';
import type { BlockItem, TimeLimit } from '~/types/storage';

const SAVED_FEEDBACK_DURATION_MS = 2000;

type LimitTypeOption = 'always' | 'daily';

interface TimeLimitEditorProps {
  item: BlockItem;
  onUpdate: (timeLimit: TimeLimit | null) => void | Promise<void>;
  /** 今日（ローカル日付）そのサイトが表示されていた秒数 */
  usedSeconds: number;
}

export function TimeLimitEditor({
  item,
  onUpdate,
  usedSeconds
}: TimeLimitEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  // 既存の非プリセット値を最も近いプリセット値にマイグレーション
  useEffect(() => {
    if (!item.timeLimit) return;

    const existingMinutes = Math.floor(item.timeLimit.limitSeconds / 60);
    const presets = TIME_LIMIT_CONFIG.DAILY_PRESET_MINUTES;

    // 既存の値がプリセットに含まれていない場合、マイグレーションを実行
    if (!presets.includes(existingMinutes as never)) {
      const nearestPreset = roundToNearestPreset(existingMinutes);
      setMinutes(nearestPreset);
      onUpdate({
        type: item.timeLimit.type,
        limitSeconds: nearestPreset * 60
      });
    }
  }, [item.timeLimit, onUpdate]);

  const showSavedFeedback = useCallback(() => {
    setShowSaved(true);
    if (savedTimerRef.current) {
      clearTimeout(savedTimerRef.current);
    }
    savedTimerRef.current = setTimeout(() => {
      setShowSaved(false);
      savedTimerRef.current = null;
    }, SAVED_FEEDBACK_DURATION_MS);
  }, []);

  // 現在の保存済み値
  const currentType: LimitTypeOption = item.timeLimit
    ? item.timeLimit.type
    : 'always';

  // 現在の保存済み分数
  const currentMinutes = item.timeLimit
    ? Math.floor(item.timeLimit.limitSeconds / 60)
    : TIME_LIMIT_CONFIG.DEFAULT_DAILY_LIMIT / 60;

  // 既存の制限時間を取得し、プリセット値に丸める
  const getInitialMinutes = () => {
    if (!item.timeLimit) {
      return TIME_LIMIT_CONFIG.DEFAULT_DAILY_LIMIT / 60;
    }

    const existingMinutes = Math.floor(item.timeLimit.limitSeconds / 60);
    // 既存の値がプリセット外の場合、最も近いプリセット値に丸める
    return roundToNearestPreset(existingMinutes);
  };

  // ローカルステートで編集中の値を管理
  const [selectedType, setSelectedType] =
    useState<LimitTypeOption>(currentType);
  const [minutes, setMinutes] = useState(getInitialMinutes());

  // 保存済み値が変更されたときにローカルステートを更新
  useEffect(() => {
    setSelectedType(currentType);
    setMinutes(currentMinutes);
  }, [currentType, currentMinutes]);

  // 変更があるかチェック
  const hasChanges =
    selectedType !== currentType ||
    (selectedType !== 'always' && minutes !== currentMinutes);

  const handleTypeChange = useCallback((newType: LimitTypeOption) => {
    setSelectedType(newType);

    // タイプ変更時にデフォルトのプリセット値を設定
    if (newType !== 'always') {
      const defaultMinutes = TIME_LIMIT_CONFIG.DEFAULT_DAILY_LIMIT / 60;
      setMinutes(roundToNearestPreset(defaultMinutes));
    }
  }, []);

  const handleMinutesChange = useCallback((value: string) => {
    const newMinutes = parseInt(value, 10);
    if (isNaN(newMinutes) || newMinutes < 1) return;
    setMinutes(newMinutes);
  }, []);

  // 保存ボタンのハンドラー
  const handleSave = useCallback(async () => {
    if (selectedType === 'always') {
      await onUpdate(null);
    } else {
      await onUpdate({
        type: selectedType,
        limitSeconds: minutes * 60
      });
    }
    showSavedFeedback();
  }, [selectedType, minutes, onUpdate, showSavedFeedback]);

  const typeOptions = [
    { value: 'always', label: getMessage('alwaysBlocked') },
    { value: 'daily', label: getMessage('dailyLimit') }
  ];

  // プリセット選択肢を生成
  const getPresetOptions = () => {
    const presets = TIME_LIMIT_CONFIG.DAILY_PRESET_MINUTES;

    return presets.map((preset) => ({
      value: preset.toString(),
      label: `${preset} ${getMessage('minutes')}`
    }));
  };

  const remainingSeconds = item.timeLimit
    ? item.timeLimit.limitSeconds - usedSeconds
    : null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
      >
        <Clock className="w-3 h-3" />
        {item.timeLimit ? (
          <span>
            {getMessage('limitMinutes', minutes.toString())}
            {getMessage('perDay')}
          </span>
        ) : (
          <span>{getMessage('alwaysBlocked')}</span>
        )}
        {isExpanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {getMessage('timeLimitType')}
            </label>
            <Select
              value={selectedType}
              onChange={(value) => handleTypeChange(value as LimitTypeOption)}
              options={typeOptions}
            />
          </div>

          {selectedType !== 'always' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {getMessage('timeLimitDuration')}
              </label>
              <Select
                value={minutes.toString()}
                onChange={handleMinutesChange}
                options={getPresetOptions()}
              />
              <p className="text-xs text-gray-400 mt-1">
                {getMessage('resetDaily')}
              </p>
            </div>
          )}

          {/* 保存ボタン */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={!hasChanges}
              size="sm"
              variant="primary"
            >
              {getMessage('save')}
            </Button>
            {showSaved && (
              <div className="flex items-center gap-1 text-xs text-success-600 animate-fade-in">
                <Check className="w-3 h-3" />
                <span>{getMessage('saved')}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Show remaining time badge if time limit is set and item is enabled */}
      {item.enabled && item.timeLimit && remainingSeconds !== null && (
        <div className="mt-2">
          <TimeLimitBadge
            remainingSeconds={Math.max(0, remainingSeconds)}
            limitSeconds={item.timeLimit.limitSeconds}
            compact
          />
        </div>
      )}
    </div>
  );
}
