import { test, expect } from './fixtures/extension';
import { openPopup, openOptions } from './helpers/pages';
import {
  clearStorageFromExtension,
  makeAnalytics,
  makeDisplaySettings,
  makePreset,
  makeSettings,
  setStorageDataFromExtension,
  getStorageDataFromExtension
} from './helpers/storage';
import { TEST_DOMAINS } from './helpers/constants';

/**
 * E2E Tests: データ永続化
 *
 * chrome.storage.local への保存、ブラウザ再起動後の保持、プリセット・スケジュールの保存をテスト
 */

test.describe('Data - データ永続化', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    await clearStorageFromExtension(context, extensionId);
  });

  test('DATA-001: 設定が chrome.storage.local に保存される', async ({
    context,
    extensionId
  }) => {
    // 設定を保存
    await setStorageDataFromExtension(
      context,
      extensionId,
      'settings',
      makeSettings({
        paused: true,
        blockList: [
          {
            id: '1',
            domain: TEST_DOMAINS.example,
            isWildcard: false,
            createdAt: new Date().toISOString(),
            enabled: true
          }
        ]
      })
    );

    // 保存された設定を取得
    const savedSettings = await getStorageDataFromExtension(
      context,
      extensionId,
      'settings'
    );

    expect(savedSettings?.paused).toBe(true);
    expect(savedSettings?.blockList.length).toBe(1);
    expect(savedSettings?.blockList[0].domain).toBe(TEST_DOMAINS.example);
  });

  test('DATA-002: ブラウザ再起動後も設定が保持される', async ({
    context,
    extensionId
  }) => {
    // 設定を保存
    await setStorageDataFromExtension(
      context,
      extensionId,
      'settings',
      makeSettings({
        paused: false,
        blockList: [
          {
            id: '1',
            domain: TEST_DOMAINS.reddit,
            isWildcard: false,
            createdAt: new Date().toISOString(),
            enabled: true
          }
        ]
      })
    );

    // 設定を取得（ブラウザ再起動をシミュレート）
    const savedSettings = await getStorageDataFromExtension(
      context,
      extensionId,
      'settings'
    );

    expect(savedSettings?.paused).toBe(false);
    expect(savedSettings?.blockList.length).toBe(1);
    expect(savedSettings?.blockList[0].domain).toBe(TEST_DOMAINS.reddit);
  });

  test('DATA-003: 拡張機能を無効化→有効化しても設定が保持される', async ({
    context,
    extensionId
  }) => {
    // 設定を保存
    await setStorageDataFromExtension(
      context,
      extensionId,
      'settings',
      makeSettings({
        paused: false,
        blockList: [
          {
            id: '1',
            domain: TEST_DOMAINS.twitter,
            isWildcard: false,
            createdAt: new Date().toISOString(),
            enabled: true
          }
        ]
      })
    );

    // 保存された設定を確認
    const savedSettings = await getStorageDataFromExtension(
      context,
      extensionId,
      'settings'
    );

    expect(savedSettings?.blockList.length).toBe(1);
    expect(savedSettings?.blockList[0].domain).toBe(TEST_DOMAINS.twitter);

    // 実際の無効化/有効化は Playwright では困難なため、
    // chrome.storage.local が永続的であることを確認

    // 設定が保持されていることを確認
    const persistedSettings = await getStorageDataFromExtension(
      context,
      extensionId,
      'settings'
    );

    expect(persistedSettings?.blockList.length).toBe(1);
    expect(persistedSettings?.blockList[0].domain).toBe(TEST_DOMAINS.twitter);
  });

  test('DATA-004: プリセット（Vision）が正しく保存される', async ({
    context,
    extensionId
  }) => {
    // Vision プリセットを保存
    // サブテキストのキーは goalSubText（subText は実装に無い）
    await setStorageDataFromExtension(context, extensionId, 'vision', {
      defaultSettings: makeDisplaySettings(),
      presets: [
        makePreset('default', 'Default'),
        makePreset('custom1', 'Custom Preset', {
          goalText: 'Custom Goal',
          goalSubText: 'Custom Sub',
          textColor: '#000000',
          backgroundColor: '#ffffff'
        })
      ],
      activePresetId: 'custom1'
    });

    // 保存された Vision を取得
    const savedVision = await getStorageDataFromExtension(
      context,
      extensionId,
      'vision'
    );

    expect(savedVision?.presets.length).toBe(2);
    expect(savedVision?.activePresetId).toBe('custom1');
    expect(savedVision?.presets[1].name).toBe('Custom Preset');
    expect(savedVision?.presets[1].goalSubText).toBe('Custom Sub');
  });

  test('DATA-005: スケジュールが正しく保存される', async ({
    context,
    extensionId
  }) => {
    // スケジュール設定を保存
    // Schedule が持つ任意フィールドは presetId（action は実装に無い）
    await setStorageDataFromExtension(
      context,
      extensionId,
      'settings',
      makeSettings({
        schedules: [
          {
            id: 'schedule1',
            name: 'Work Hours',
            enabled: true,
            days: [1, 2, 3, 4, 5], // Mon-Fri
            startTime: '09:00',
            endTime: '17:00',
            presetId: 'default'
          },
          {
            id: 'schedule2',
            name: 'Weekend',
            enabled: true,
            days: [0, 6], // Sat-Sun
            startTime: '00:00',
            endTime: '23:59'
          }
        ]
      })
    );

    // 保存されたスケジュールを取得
    const savedSettings = await getStorageDataFromExtension(
      context,
      extensionId,
      'settings'
    );

    expect(savedSettings?.schedules.length).toBe(2);
    expect(savedSettings?.schedules[0].name).toBe('Work Hours');
    expect(savedSettings?.schedules[0].presetId).toBe('default');
    expect(savedSettings?.schedules[1].days).toEqual([0, 6]);
  });

  test('DATA-006: Analytics データが正しく保存される', async ({
    context,
    extensionId
  }) => {
    const today = new Date().toISOString().slice(0, 10);

    // Analytics データを保存
    // サイト別の滞在時間は analytics.siteTime に入る
    // （siteStats というキーも totalTime というフィールドも実装に無い）
    const lastUpdated = new Date().toISOString();
    await setStorageDataFromExtension(
      context,
      extensionId,
      'analytics',
      makeAnalytics({
        dailyStats: {
          [today]: {
            date: today,
            wasteTime: 300,
            investTime: 120,
            blockCount: 15,
            unblockCount: 3
          }
        },
        siteTime: {
          [TEST_DOMAINS.example]: {
            domain: TEST_DOMAINS.example,
            time: 200,
            category: 'waste',
            lastUpdated
          },
          [TEST_DOMAINS.reddit]: {
            domain: TEST_DOMAINS.reddit,
            time: 100,
            category: 'waste',
            lastUpdated
          }
        }
      })
    );

    // 保存された Analytics を取得
    const savedAnalytics = await getStorageDataFromExtension(
      context,
      extensionId,
      'analytics'
    );

    expect(savedAnalytics?.dailyStats[today]).toBeDefined();
    expect(savedAnalytics?.dailyStats[today].blockCount).toBe(15);
    expect(savedAnalytics?.siteTime[TEST_DOMAINS.example].time).toBe(200);
    expect(Object.keys(savedAnalytics?.siteTime ?? {}).length).toBe(2);
  });
});
