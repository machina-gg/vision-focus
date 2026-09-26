import { execFileSync } from 'child_process';
import fs from 'fs';
import https from 'https';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'net';

// youtube.com は HSTS プリロード済みで http:// も https:// に昇格されるため、HTTPS で待ち受ける

export interface TestServer {
  port: number;
  close: () => Promise<void>;
}

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderPage(rawHost: string, rawPathname: string): string {
  const host = escapeHtml(rawHost);
  const pathname = escapeHtml(rawPathname);
  const isYouTube = /(^|\.)youtube\.com$/.test(rawHost);

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

export async function startTestServer(): Promise<TestServer> {
  const { key, cert } = createSelfSignedCert();

  const server = https.createServer({ key, cert }, (req, res) => {
    const host = (req.headers.host ?? 'unknown').replace(/:\d+$/, '');
    const pathname = req.url ?? '/';

    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
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
