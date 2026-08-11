import { execFileSync } from 'child_process';
import fs from 'fs';
import https from 'https';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'net';

/**
 * E2E 用のローカル Web サーバ
 *
 * ブロック機能のテストは「実際のサイトに遷移して拡張機能が止めるか」を見るため、
 * 従来は youtube.com や example.com へ実アクセスしていた。ネットワークが無い環境
 * （CI のサンドボックス、オフライン開発）では ERR_NAME_NOT_RESOLVED で落ちるうえ、
 * 外部サイトの都合でテストが壊れる。
 *
 * そこで、Chromium の --host-resolver-rules で全ホストをこのサーバへ向け、
 * テスト対象のドメインをローカルで再現する。拡張機能側は declarativeNetRequest の
 * `||domain` でスキーム非依存に判定しているため、実サイトと同じ経路を通る。
 *
 * HTTPS で待ち受ける理由: youtube.com は HSTS プリロード済みで、http:// でアクセス
 * しても Chromium が https:// に内部昇格させる。平文 HTTP では接続が成立しない。
 * 証明書は起動時に自己署名で生成し（リポジトリには含めない）、ブラウザ側は
 * --ignore-certificate-errors で受け入れる。
 */

export interface TestServer {
  /** 待ち受けポート。--host-resolver-rules に渡す */
  port: number;
  close: () => Promise<void>;
}

/** 自己署名証明書を一時ディレクトリに生成する */
function createSelfSignedCert(): { key: string; cert: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vf-e2e-cert-'));
  const keyPath = path.join(dir, 'key.pem');
  const certPath = path.join(dir, 'cert.pem');

  execFileSync('openssl', [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    keyPath,
    '-out',
    certPath,
    '-days',
    '365',
    '-subj',
    '/CN=vision-focus-e2e'
  ]);

  const key = fs.readFileSync(keyPath, 'utf8');
  const cert = fs.readFileSync(certPath, 'utf8');
  fs.rmSync(dir, { recursive: true, force: true });

  return { key, cert };
}

/** ホスト名からテスト用のページを組み立てる */
function renderPage(host: string, pathname: string): string {
  const isYouTube = /(^|\.)youtube\.com$/.test(host);

  // YouTube のコンテンツスクリプトは実 DOM を前提に CSS を注入するため、
  // 隠す対象の要素だけを最小限に再現する
  const youtubeBody = `
    <ytd-app>
      <div id="content">
        <ytd-browse page-subtype="home">
          <ytd-rich-grid-renderer>
            <div id="contents">
              <ytd-rich-shelf-renderer is-shorts>Shorts shelf</ytd-rich-shelf-renderer>
              <ytd-reel-shelf-renderer>Reel shelf</ytd-reel-shelf-renderer>
            </div>
          </ytd-rich-grid-renderer>
        </ytd-browse>
        <ytd-watch-flexy>
          <div id="secondary"><div id="secondary-inner"><div id="related">Related videos</div></div></div>
          <ytd-comments id="comments">Comments</ytd-comments>
        </ytd-watch-flexy>
      </div>
    </ytd-app>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${host}${pathname}</title>
  </head>
  <body>
    <h1 data-testid="test-site-heading">${host}</h1>
    <p data-testid="test-site-path">${pathname}</p>
    ${isYouTube ? youtubeBody : ''}
  </body>
</html>`;
}

/**
 * ローカル HTTPS サーバを起動する
 *
 * ポートは 0 を指定して OS に選ばせる。並列ワーカーごとに 1 台起動しても
 * 衝突しない。
 */
export async function startTestServer(): Promise<TestServer> {
  const { key, cert } = createSelfSignedCert();

  const server = https.createServer({ key, cert }, (req, res) => {
    const host = (req.headers.host ?? 'unknown').replace(/:\d+$/, '');
    const pathname = req.url ?? '/';

    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      // ブロック判定はページの内容に依存しないため、キャッシュは無効にしておく
      'cache-control': 'no-store'
    });
    res.end(renderPage(host, pathname));
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const port = (server.address() as AddressInfo).port;

  return {
    port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      })
  };
}
