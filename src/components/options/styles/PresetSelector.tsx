import React from 'react';
import { Check, Plus, Save, Target, Trash2 } from 'lucide-react';

import { Button, Card } from '~/components/ui';
import { getMessage } from '~/lib/i18n';
import type { VisionSettings, DashboardDisplaySettings } from '~/types/storage';
import { MAX_PRESETS } from '~/constants/limits';
import type { UsePresetsReturn } from '~/hooks/usePresets';

/** PresetSelector に渡すプリセット編集の状態と、適用中のプリセットを引く表示設定 */
interface PresetSelectorProps {
  /** usePresets が返す、プリセットの下書き一覧と選択・保存・適用・削除の操作 */
  presets: UsePresetsReturn;
  /** 適用中のプリセットを示すための表示設定（読み込み前は undefined で、適用中の印を出さない） */
  vision: VisionSettings | undefined;
}

/**
 * プリセットの一覧と作成ボタン、選択中のプリセットの保存・適用・削除の操作を表示する（プリセットが無ければ作成を促す）
 * @param props プリセット編集の状態と表示設定（各フィールドは PresetSelectorProps）
 * @returns プリセットのカードと、選択中のプリセットの編集状態の表示
 */
export function PresetSelector({ presets, vision }: PresetSelectorProps) {
  const {
    draftPresets,
    selectedPresetId,
    draftDisplaySettings,
    editingPresetName,
    isDirty,
    visionSaved,
    setShowSavePresetModal,
    handleSelectPreset,
    handleRequestDeletePreset,
    handleApplyPreset,
    handleSaveSelectedPreset
  } = presets;

  const selectedPreset = draftPresets.find((p) => p.id === selectedPresetId);

  return (
    <>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-lg font-semibold text-gray-900"
            data-testid="styles-section-heading"
          >
            {getMessage('dashboardPresets')}
          </h2>
        </div>

        {draftPresets.length === 0 ? (
          <EmptyState onCreateClick={() => setShowSavePresetModal(true)} />
        ) : (
          <>
            <PresetButtons
              draftPresets={draftPresets}
              vision={vision}
              selectedPresetId={selectedPresetId}
              onSelectPreset={handleSelectPreset}
              onCreateClick={() => setShowSavePresetModal(true)}
            />

            {draftPresets.length >= MAX_PRESETS && (
              <p className="text-xs text-gray-500 mt-2">
                {getMessage('maxPresetsReached', String(MAX_PRESETS))}
              </p>
            )}
          </>
        )}
      </Card>

      {selectedPreset && (
        <EditingIndicator
          selectedPreset={selectedPreset}
          selectedPresetId={selectedPresetId}
          isDirty={isDirty}
          visionSaved={visionSaved}
          draftDisplaySettings={draftDisplaySettings}
          editingPresetName={editingPresetName}
          vision={vision}
          onDeletePreset={handleRequestDeletePreset}
          onApplyPreset={handleApplyPreset}
          onSavePreset={handleSaveSelectedPreset}
        />
      )}
    </>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="text-center py-6">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <Target className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-900 mb-1">
        {getMessage('noPresetsTitle')}
      </p>
      <p className="text-xs text-gray-500 mb-4">
        {getMessage('noPresetsDescription')}
      </p>
      <Button
        onClick={onCreateClick}
        size="sm"
        data-testid="style-create-first-button"
      >
        <Plus className="w-4 h-4" />
        {getMessage('createFirstPreset')}
      </Button>
    </div>
  );
}

/** PresetButtons に渡すプリセットの一覧と操作 */
interface PresetButtonsProps {
  /** ボタンとして並べるプリセットの下書き（上限に達していれば新規作成ボタンを出さない） */
  draftPresets: UsePresetsReturn['draftPresets'];
  /** 適用中のプリセットにチェックを付けるための表示設定（読み込み前は undefined で、チェックを付けない） */
  vision: VisionSettings | undefined;
  /** 編集のために選んでいるプリセットの id（null なら未選択） */
  selectedPresetId: string | null;
  /** プリセットのボタンが押されたときに、その id を受け取る */
  onSelectPreset: (presetId: string) => void;
  /** 新規作成ボタンが押されたときに呼ぶ */
  onCreateClick: () => void;
}

/**
 * プリセットを選ぶボタンの並びと、新規作成ボタンを表示する
 * @param props プリセットの一覧と操作（各フィールドは PresetButtonsProps）
 * @returns プリセットのボタンの並び
 */
function PresetButtons({
  draftPresets,
  vision,
  selectedPresetId,
  onSelectPreset,
  onCreateClick
}: PresetButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {draftPresets.map((preset) => {
        const isActive = vision?.activePresetId === preset.id;
        const isSelected = selectedPresetId === preset.id;
        return (
          <button
            key={preset.id}
            data-testid="style-preset-button"
            data-active={String(isActive)}
            aria-pressed={isSelected}
            onClick={() => onSelectPreset(preset.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              isSelected
                ? 'bg-info-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isActive && (
              <Check
                className={`w-3.5 h-3.5 ${
                  isSelected ? 'text-white' : 'text-success-600'
                }`}
              />
            )}
            {preset.name}
          </button>
        );
      })}

      {draftPresets.length < MAX_PRESETS && (
        <button
          data-testid="style-new-preset-button"
          onClick={onCreateClick}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          {getMessage('newPreset')}
        </button>
      )}
    </div>
  );
}

/** EditingIndicator に渡す編集中のプリセットの状態と操作 */
interface EditingIndicatorProps {
  /** 編集中のプリセットの id と名前 */
  selectedPreset: { id: string; name: string };
  /** 編集のために選んでいるプリセットの id（適用中かの判定に使う） */
  selectedPresetId: string | null;
  /** true なら未保存の変更がある印を出す。false なら保存ボタンを押せない */
  isDirty: boolean;
  /** true なら保存ボタンの文言を「保存しました」にする */
  visionSaved: boolean;
  /** 編集中の表示設定の下書き（目標が空白だけなら保存ボタンを押せない） */
  draftDisplaySettings: DashboardDisplaySettings;
  /** 編集中のプリセット名（空白だけなら保存ボタンを押せない） */
  editingPresetName: string;
  /** 適用中のプリセットを引く表示設定（編集中のものが適用中なら、適用ボタンの代わりに適用中の印を出す） */
  vision: VisionSettings | undefined;
  /** 削除ボタンが押されたときに、編集中のプリセットの id を受け取る */
  onDeletePreset: (id: string) => Promise<void>;
  /** 適用ボタンが押されたときに呼ぶ */
  onApplyPreset: () => Promise<void>;
  /** 保存ボタンが押されたときに呼ぶ */
  onSavePreset: () => Promise<void>;
}

/**
 * 編集中のプリセット名と未保存の印、削除・適用・保存のボタンを帯で表示する
 * @param props 編集中のプリセットの状態と操作（各フィールドは EditingIndicatorProps）
 * @returns 編集中のプリセットの帯
 */
function EditingIndicator({
  selectedPreset,
  selectedPresetId,
  isDirty,
  visionSaved,
  draftDisplaySettings,
  editingPresetName,
  vision,
  onDeletePreset,
  onApplyPreset,
  onSavePreset
}: EditingIndicatorProps) {
  return (
    <div className="flex items-center justify-between bg-info-50 border border-info-200 rounded-lg px-4 py-3">
      <div className="flex items-center gap-2">
        <Target className="w-5 h-5 text-info-600" />
        <span className="text-sm font-medium text-info-900">
          {getMessage('editingPreset', selectedPreset.name)}
        </span>
        {isDirty && (
          <span className="text-xs text-premium-600 bg-premium-100 px-2 py-0.5 rounded-full">
            {getMessage('unsavedChanges')}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDeletePreset(selectedPreset.id)}
          data-testid="style-delete-button"
        >
          <Trash2 className="w-4 h-4 text-danger-500" />
        </Button>
        {vision?.activePresetId === selectedPresetId ? (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-success-700 bg-success-100 rounded-lg">
            <Check className="w-4 h-4" />
            {getMessage('activePreset')}
          </span>
        ) : (
          <Button
            variant="secondary"
            onClick={onApplyPreset}
            size="sm"
            data-testid="style-apply-button"
          >
            <Check className="w-4 h-4" />
            {getMessage('applyPreset')}
          </Button>
        )}
        <Button
          onClick={onSavePreset}
          disabled={
            !draftDisplaySettings.goalText.trim() ||
            !editingPresetName.trim() ||
            !isDirty
          }
          size="sm"
          data-testid="style-save-button"
        >
          <Save className="w-4 h-4" />
          {visionSaved ? getMessage('saved') : getMessage('save')}
        </Button>
      </div>
    </div>
  );
}
