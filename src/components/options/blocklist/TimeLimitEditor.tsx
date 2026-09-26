import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Clock, ChevronDown, ChevronUp, Check } from 'lucide-react';

import { Select, Button } from '~/components/ui';
import { TimeLimitBadge } from '~/components/features';
import { getMessage } from '~/lib/i18n';
import { TIME_LIMIT_CONFIG, roundToNearestPreset } from '~/constants/limits';
import type { BlockedSite } from '~/lib/blockList';
import type { TimeLimit } from '~/types/storage';

const SAVED_FEEDBACK_DURATION_MS = 2000;

type LimitTypeOption = 'always' | 'daily';

/** TimeLimitEditor に渡すサイトと保存先 */
interface TimeLimitEditorProps {
  /** 時間制限を編集するブロック中のサイト */
  site: BlockedSite;
  /** 保存した時間制限を受け取る（null なら常にブロック）。既存の分数が選択肢に無いときは最も近い選択肢に直して呼ぶ */
  onUpdate: (timeLimit: TimeLimit | null) => void | Promise<void>;
  /** 今日の使用時間（秒。残り時間のバッジに使う） */
  usedSeconds: number;
}

/**
 * サイトの時間制限（常にブロックか 1 日の上限か）を開閉できる欄で編集させ、制限があれば今日の残り時間をバッジで表示する
 * @param props サイトと保存先（各フィールドは TimeLimitEditorProps）
 * @returns 時間制限の編集欄
 */
export function TimeLimitEditor({
  site,
  onUpdate,
  usedSeconds
}: TimeLimitEditorProps) {
  const { enabled, timeLimit } = site.block;
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!timeLimit) return;

    const existingMinutes = Math.floor(timeLimit.limitSeconds / 60);
    const presets = TIME_LIMIT_CONFIG.DAILY_PRESET_MINUTES;

    if (!presets.includes(existingMinutes as never)) {
      const nearestPreset = roundToNearestPreset(existingMinutes);
      setMinutes(nearestPreset);
      onUpdate({
        type: timeLimit.type,
        limitSeconds: nearestPreset * 60
      });
    }
  }, [timeLimit, onUpdate]);

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

  const currentType: LimitTypeOption = timeLimit ? timeLimit.type : 'always';

  const currentMinutes = timeLimit
    ? Math.floor(timeLimit.limitSeconds / 60)
    : TIME_LIMIT_CONFIG.DEFAULT_DAILY_LIMIT / 60;

  const getInitialMinutes = () => {
    if (!timeLimit) {
      return TIME_LIMIT_CONFIG.DEFAULT_DAILY_LIMIT / 60;
    }

    const existingMinutes = Math.floor(timeLimit.limitSeconds / 60);
    return roundToNearestPreset(existingMinutes);
  };

  const [selectedType, setSelectedType] =
    useState<LimitTypeOption>(currentType);
  const [minutes, setMinutes] = useState(getInitialMinutes());

  useEffect(() => {
    setSelectedType(currentType);
    setMinutes(currentMinutes);
  }, [currentType, currentMinutes]);

  const hasChanges =
    selectedType !== currentType ||
    (selectedType !== 'always' && minutes !== currentMinutes);

  const handleTypeChange = useCallback((newType: LimitTypeOption) => {
    setSelectedType(newType);

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

  const getPresetOptions = () => {
    const presets = TIME_LIMIT_CONFIG.DAILY_PRESET_MINUTES;

    return presets.map((preset) => ({
      value: preset.toString(),
      label: `${preset} ${getMessage('minutes')}`
    }));
  };

  const remainingSeconds = timeLimit
    ? timeLimit.limitSeconds - usedSeconds
    : null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
      >
        <Clock className="w-3 h-3" />
        {timeLimit ? (
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

      {enabled && timeLimit && remainingSeconds !== null && (
        <div className="mt-2">
          <TimeLimitBadge
            remainingSeconds={Math.max(0, remainingSeconds)}
            limitSeconds={timeLimit.limitSeconds}
            compact
          />
        </div>
      )}
    </div>
  );
}
