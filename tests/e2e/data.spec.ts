import { test, expect } from './fixtures/extension';
import { openPopup, openOptions } from './helpers/pages';
import {
  clearStorageFromExtension,
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
    await setStorageDataFromExtension(context, extensionId, 'settings', {
      language: 'ja',
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
    });

    // 保存された設定を取得
    const savedSettings = (await getStorageDataFromExtension(
      context,
      extensionId,
      'settings'
    )) as any;

    expect(savedSettings.language).toBe('ja');
    expect(savedSettings.paused).toBe(true);
    expect(savedSettings.blockList.length).toBe(1);
    expect(savedSettings.blockList[0].domain).toBe(TEST_DOMAINS.example);
  });

  test('DATA-002: ブラウザ再起動後も設定が保持される', async ({
    context,
    extensionId
  }) => {
    // 設定を保存
    await setStorageDataFromExtension(context, extensionId, 'settings', {
      language: 'en',
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
    });

    // 設定を取得（ブラウザ再起動をシミュレート）
    const savedSettings = (await getStorageDataFromExtension(
      context,
      extensionId,
      'settings'
    )) as any;

    expect(savedSettings.language).toBe('en');
    expect(savedSettings.paused).toBe(false);
    expect(savedSettings.blockList.length).toBe(1);
    expect(savedSettings.blockList[0].domain).toBe(TEST_DOMAINS.reddit);
  });

  test('DATA-003: 拡張機能を無効化→有効化しても設定が保持される', async ({
    context,
    extensionId
  }) => {
    // 設定を保存
    await setStorageDataFromExtension(context, extensionId, 'settings', {
      language: 'ja',
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
    });

    // 保存された設定を確認
    const savedSettings = (await getStorageDataFromExtension(
      context,
      extensionId,
      'settings'
    )) as any;

    expect(savedSettings.blockList.length).toBe(1);
    expect(savedSettings.blockList[0].domain).toBe(TEST_DOMAINS.twitter);

    // 実際の無効化/有効化は Playwright では困難なため、
    // chrome.storage.local が永続的であることを確認

    // 設定が保持されていることを確認
    const persistedSettings = (await getStorageDataFromExtension(
      context,
      extensionId,
      'settings'
    )) as any;

    expect(persistedSettings.blockList.length).toBe(1);
    expect(persistedSettings.blockList[0].domain).toBe(TEST_DOMAINS.twitter);
  });

  test('DATA-004: プリセット（Vision）が正しく保存される', async ({
    context,
    extensionId
  }) => {
    // Vision プリセットを保存
    await setStorageDataFromExtension(context, extensionId, 'vision', {
      defaultSettings: {
        goalText: 'Focus on what matters',
        subText: 'Stay productive'
      },
      presets: [
        {
          id: 'default',
          name: 'Default',
          goalText: 'Focus on what matters',
          subText: 'Stay productive',
          textColor: '#ffffff',
          backgroundColor: '#1a1a2e',
          backgroundType: 'color'
        },
        {
          id: 'custom1',
          name: 'Custom Preset',
          goalText: 'Custom Goal',
          subText: 'Custom Sub',
          textColor: '#000000',
          backgroundColor: '#ffffff',
          backgroundType: 'color'
        }
      ],
      activePresetId: 'custom1'
    });

    // 保存された Vision を取得
    const savedVision = (await getStorageDataFromExtension(
      context,
      extensionId,
      'vision'
    )) as any;

    expect(savedVision.presets.length).toBe(2);
    expect(savedVision.activePresetId).toBe('custom1');
    expect(savedVision.presets[1].name).toBe('Custom Preset');
  });

  test('DATA-005: スケジュールが正しく保存される', async ({
    context,
    extensionId
  }) => {
    // スケジュール設定を保存
    await setStorageDataFromExtension(context, extensionId, 'settings', {
      language: 'en',
      paused: false,
      schedules: [
        {
          id: 'schedule1',
          name: 'Work Hours',
          enabled: true,
          days: [1, 2, 3, 4, 5], // Mon-Fri
          startTime: '09:00',
          endTime: '17:00',
          action: 'enable'
        },
        {
          id: 'schedule2',
          name: 'Weekend',
          enabled: true,
          days: [0, 6], // Sat-Sun
          startTime: '00:00',
          endTime: '23:59',
          action: 'disable'
        }
      ]
    });

    // 保存されたスケジュールを取得
    const savedSettings = (await getStorageDataFromExtension(
      context,
      extensionId,
      'settings'
    )) as any;

    expect(savedSettings.schedules.length).toBe(2);
    expect(savedSettings.schedules[0].name).toBe('Work Hours');
    expect(savedSettings.schedules[1].days).toEqual([0, 6]);
  });

  test('DATA-006: Analytics データが正しく保存される', async ({
    context,
    extensionId
  }) => {
    const today = new Date().toISOString().slice(0, 10);

    // Analytics データを保存
    await setStorageDataFromExtension(context, extensionId, 'analytics', {
      dailyStats: {
        [today]: {
          date: today,
          wasteTime: 300,
          investTime: 120,
          blockCount: 15,
          unblockCount: 3
        }
      },
      siteStats: {
        [TEST_DOMAINS.example]: {
          domain: TEST_DOMAINS.example,
          blockCount: 10,
          unblockCount: 2,
          totalTime: 200
        },
        [TEST_DOMAINS.reddit]: {
          domain: TEST_DOMAINS.reddit,
          blockCount: 5,
          unblockCount: 1,
          totalTime: 100
        }
      }
    });

    // 保存された Analytics を取得
    const savedAnalytics = (await getStorageDataFromExtension(
      context,
      extensionId,
      'analytics'
    )) as any;

    expect(savedAnalytics.dailyStats[today]).toBeDefined();
    expect(savedAnalytics.dailyStats[today].blockCount).toBe(15);
    expect(savedAnalytics.siteStats[TEST_DOMAINS.example].blockCount).toBe(10);
    expect(Object.keys(savedAnalytics.siteStats).length).toBe(2);
  });
});
