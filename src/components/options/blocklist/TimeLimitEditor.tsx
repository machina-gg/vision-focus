import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Clock, ChevronDown, ChevronUp, Check } from 'lucide-react';

import { Input, Select, Button } from '~/components/ui';
import { TimeLimitBadge } from '~/components/features';
import { getMessage } from '~/lib/i18n';
import { TIME_LIMIT_CONFIG } from '~/constants/limits';
import type {
  BlockItem,
  TimeLimit,
  TimeLimitType,
  TimeLimitUsage
} from '~/types/storage';

const SAVED_FEEDBACK_DURATION_MS = 2000;

type LimitTypeOption = 'always' | 'daily' | 'hourly';

interface TimeLimitEditorProps {
  item: BlockItem;
  onUpdate: (timeLimit: TimeLimit | null) => void | Promise<void>;
  usage?: TimeLimitUsage;
}

export function TimeLimitEditor({
  item,
  onUpdate,
  usage
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
  const currentMinutes = item.timeLimit
    ? Math.floor(item.timeLimit.limitSeconds / 60)
    : currentType === 'daily'
      ? TIME_LIMIT_CONFIG.DEFAULT_DAILY_LIMIT / 60
      : TIME_LIMIT_CONFIG.DEFAULT_HOURLY_LIMIT / 60;

  // ローカルステートで編集中の値を管理
  const [selectedType, setSelectedType] =
    useState<LimitTypeOption>(currentType);
  const [minutes, setMinutes] = useState(currentMinutes);

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

    // タイプ変更時にデフォルト値を設定
    if (newType !== 'always') {
      const defaultMinutes =
        newType === 'daily'
          ? TIME_LIMIT_CONFIG.DEFAULT_DAILY_LIMIT / 60
          : TIME_LIMIT_CONFIG.DEFAULT_HOURLY_LIMIT / 60;
      setMinutes(defaultMinutes);
    }
  }, []);

  const handleMinutesChange = useCallback((value: string) => {
    const newMinutes = parseInt(value, 10);
    if (isNaN(newMinutes) || newMinutes < 1) return;

    const clampedMinutes = Math.min(
      Math.max(newMinutes, TIME_LIMIT_CONFIG.MIN_LIMIT_SECONDS / 60),
      TIME_LIMIT_CONFIG.MAX_LIMIT_SECONDS / 60
    );
    setMinutes(clampedMinutes);
  }, []);

  // 保存ボタンのハンドラー
  const handleSave = useCallback(async () => {
    if (selectedType === 'always') {
      await onUpdate(null);
    } else {
      await onUpdate({
        type: selectedType as TimeLimitType,
        limitSeconds: minutes * 60
      });
    }
    showSavedFeedback();
  }, [selectedType, minutes, onUpdate, showSavedFeedback]);

  const typeOptions = [
    { value: 'always', label: getMessage('alwaysBlocked') },
    { value: 'daily', label: getMessage('dailyLimit') },
    { value: 'hourly', label: getMessage('hourlyLimit') }
  ];

  // Calculate remaining time for display
  const remainingSeconds =
    item.timeLimit && usage
      ? item.timeLimit.limitSeconds -
        (item.timeLimit.type === 'daily'
          ? usage.dailyUsedSeconds
          : usage.hourlyUsedSeconds)
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
            {item.timeLimit.type === 'daily'
              ? getMessage('perDay')
              : getMessage('perHour')}
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
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={minutes.toString()}
                  onChange={handleMinutesChange}
                  min={1}
                  max={TIME_LIMIT_CONFIG.MAX_LIMIT_SECONDS / 60}
                  className="w-24"
                />
                <span className="text-sm text-gray-500">
                  {getMessage('minutes')}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {selectedType === 'daily'
                  ? getMessage('resetDaily')
                  : getMessage('resetHourly')}
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
            limitType={item.timeLimit.type}
            compact
          />
        </div>
      )}
    </div>
  );
}
