import { describe, expect, it, vi, beforeEach } from 'vitest';

// ExtPay モジュールをモック
const mockExtPayInstance = {
  getUser: vi.fn(),
  openPaymentPage: vi.fn(),
  openTrialPage: vi.fn(),
  openLoginPage: vi.fn(),
  startBackground: vi.fn(),
  onPaid: {
    addListener: vi.fn()
  }
};

vi.mock('extpay', () => ({
  default: vi.fn(() => mockExtPayInstance)
}));

import {
  getExtPay,
  getExtPayUser,
  isExtPayPremium,
  openPaymentPage,
  openTrialPage,
  openLoginPage,
  openManagementPage,
  onPaid,
  startExtPayBackgroundListener
} from '~/lib/extpay';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getExtPay', () => {
  it('ExtPayインスタンスを返す', () => {
    const ext = getExtPay();
    expect(ext).toBeTruthy();
  });
});

describe('getExtPayUser', () => {
  it('ユーザー情報を返す', async () => {
    const mockUser = {
      paid: true,
      paidAt: new Date('2024-01-01'),
      installedAt: new Date('2023-01-01'),
      trialStartedAt: null
    };
    mockExtPayInstance.getUser.mockResolvedValue(mockUser);
    const user = await getExtPayUser();
    expect(user.paid).toBe(true);
    expect(user.paidAt).toEqual(new Date('2024-01-01'));
    expect(user.installedAt).toEqual(new Date('2023-01-01'));
    expect(user.trialStartedAt).toBeNull();
  });
});

describe('isExtPayPremium', () => {
  it('支払い済みの場合はtrue', async () => {
    mockExtPayInstance.getUser.mockResolvedValue({
      paid: true,
      paidAt: new Date(),
      installedAt: new Date(),
      trialStartedAt: null
    });
    const result = await isExtPayPremium();
    expect(result).toBe(true);
  });

  it('未支払いの場合はfalse', async () => {
    mockExtPayInstance.getUser.mockResolvedValue({
      paid: false,
      paidAt: null,
      installedAt: new Date(),
      trialStartedAt: null
    });
    const result = await isExtPayPremium();
    expect(result).toBe(false);
  });

  it('エラーの場合はfalse', async () => {
    mockExtPayInstance.getUser.mockRejectedValue(new Error('Network error'));
    const result = await isExtPayPremium();
    expect(result).toBe(false);
  });
});

describe('openPaymentPage', () => {
  it('支払いページを開く', () => {
    openPaymentPage();
    expect(mockExtPayInstance.openPaymentPage).toHaveBeenCalled();
  });
});

describe('openTrialPage', () => {
  it('トライアルページを開く', () => {
    openTrialPage();
    expect(mockExtPayInstance.openTrialPage).toHaveBeenCalled();
  });
});

describe('openLoginPage', () => {
  it('ログインページを開く', () => {
    openLoginPage();
    expect(mockExtPayInstance.openLoginPage).toHaveBeenCalled();
  });
});

describe('openManagementPage', () => {
  it('管理ページ（支払いページ）を開く', () => {
    openManagementPage();
    expect(mockExtPayInstance.openPaymentPage).toHaveBeenCalled();
  });
});

describe('onPaid', () => {
  it('支払いイベントのリスナーを登録する', () => {
    const callback = vi.fn();
    onPaid(callback);
    expect(mockExtPayInstance.onPaid.addListener).toHaveBeenCalledTimes(1);
  });

  it('リスナーが呼ばれたときにコールバックにユーザー情報を渡す', () => {
    const callback = vi.fn();
    onPaid(callback);

    // addListenerに渡されたコールバックを取得
    const registeredListener =
      mockExtPayInstance.onPaid.addListener.mock.calls[0][0];
    const mockUser = {
      paid: true,
      paidAt: new Date('2024-01-01'),
      installedAt: new Date('2023-01-01'),
      trialStartedAt: null
    };
    registeredListener(mockUser);

    expect(callback).toHaveBeenCalledWith({
      paid: true,
      paidAt: new Date('2024-01-01'),
      installedAt: new Date('2023-01-01'),
      trialStartedAt: null
    });
  });
});

describe('startExtPayBackgroundListener', () => {
  it('バックグラウンドリスナーを開始する', () => {
    startExtPayBackgroundListener();
    expect(mockExtPayInstance.startBackground).toHaveBeenCalled();
  });
});
