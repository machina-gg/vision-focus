import React from 'react';

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { FormFeedback } from '../FormFeedback';

/**
 * FormFeedback の出し分けの検査
 *
 * 未設定（null）・空文字のときに何も出ないことを主に見る。
 * パスワード画面は「前回の結果が残ったまま次の操作に入る」と誤解を生むため、
 * 消したつもりの文言が残らないことが要点になる。
 */

describe('FormFeedback', () => {
  describe('どちらも無いとき', () => {
    it('error も success も null なら何も描画しない', () => {
      const { container } = render(
        <FormFeedback error={null} success={null} />
      );

      expect(container).toBeEmptyDOMElement();
    });

    it('空文字のときも何も描画しない', () => {
      const { container } = render(<FormFeedback error="" success="" />);

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('片方だけあるとき', () => {
    it('error だけを渡すとエラー文言だけが出る', () => {
      render(<FormFeedback error="パスワードが違います" success={null} />);

      expect(screen.getByText('パスワードが違います')).toBeInTheDocument();
      expect(screen.queryByText('保存しました')).not.toBeInTheDocument();
    });

    it('success だけを渡すと成功文言だけが出る', () => {
      render(<FormFeedback error={null} success="保存しました" />);

      expect(screen.getByText('保存しました')).toBeInTheDocument();
      expect(
        screen.queryByText('パスワードが違います')
      ).not.toBeInTheDocument();
    });
  });

  describe('両方あるとき', () => {
    it('両方の文言を出す', () => {
      render(
        <FormFeedback error="パスワードが違います" success="保存しました" />
      );

      expect(screen.getByText('パスワードが違います')).toBeInTheDocument();
      expect(screen.getByText('保存しました')).toBeInTheDocument();
    });
  });
});
