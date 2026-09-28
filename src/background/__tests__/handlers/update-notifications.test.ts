import { describe, expect, it, vi, beforeEach } from 'vitest';

import { invoke } from './helpers';

vi.mock('~/lib/settingsService', () => ({
  setNotifications: vi.fn()
}));

import { setNotifications } from '~/lib/settingsService';
import { updateNotificationsHandler as handler } from '../../handlers/update-notifications';
import type { MessageError } from '~/types/messages';

interface Response {
  success: boolean;
  error?: MessageError;
}

const notifications = { timeLimitEnabled: false, timeLimitMinutes: 10 };

describe('update-notifications ハンドラ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(setNotifications).mockResolvedValue(undefined);
  });

  it.each([
    ['body が null', null],
    ['notifications が無い', {}],
    [
      '分数が選択肢に無い',
      { notifications: { ...notifications, timeLimitMinutes: 2 } }
    ],
    [
      'timeLimitEnabled が boolean でない',
      { notifications: { ...notifications, timeLimitEnabled: 'yes' } }
    ]
  ])('%s なら invalid-request を返し、何も変えない', async (_label, body) => {
    const result = await invoke<Response>(handler, body);

    expect(result).toEqual({
      success: false,
      error: { code: 'invalid-request' }
    });
    expect(setNotifications).not.toHaveBeenCalled();
  });

  it('通知の設定を保存する', async () => {
    const result = await invoke<Response>(handler, { notifications });

    expect(result).toEqual({ success: true });
    expect(setNotifications).toHaveBeenCalledWith(notifications);
  });

  it('保存に失敗したら save-failed を返す', async () => {
    vi.mocked(setNotifications).mockRejectedValue(new Error('storage full'));

    const result = await invoke<Response>(handler, { notifications });

    expect(result).toEqual({ success: false, error: { code: 'save-failed' } });
  });
});
