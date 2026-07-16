import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mocksDir = path.join(__dirname, 'src', 'mocks');
const publicDir = path.join(__dirname, 'public');

// 1. Ensure src/mocks directory and its boilerplate exist
if (!fs.existsSync(mocksDir)) {
  fs.mkdirSync(mocksDir, { recursive: true });
  console.log('Created src/mocks directory');
}

const files = {
  'index.ts': `export const initMocks = async () => {
  if (typeof window === 'undefined') {
    const { server } = await import('./server');
    server.listen();
  } else {
    const { worker } = await import('./browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }
};
`,
  'browser.ts': `import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
`,
  'server.ts': `import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
`,
  'handlers.ts': `import { http, HttpResponse } from 'msw';

// Add mock handlers that match backend API endpoints and DB structures
export const handlers = [
  // Example mock handler for get services
  http.get('*/api/v1/services', () => {
    return HttpResponse.json({
      success: true,
      statusCode: 200,
      message: 'Get services mock successful',
      data: [
        { serviceId: 's1', name: 'Rửa xe tiêu chuẩn (Mock)', price: 100000, duration: 15, status: 'ACTIVE' },
        { serviceId: 's2', name: 'Rửa xe cao cấp (Mock)', price: 180000, duration: 30, status: 'ACTIVE' }
      ]
    });
  })
];
`
};

for (const [filename, content] of Object.entries(files)) {
  const filePath = path.join(mocksDir, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Created dummy ${filename} in src/mocks`);
  }
}

// 2. Ensure mockServiceWorker.js exists in public/
const serviceWorkerPath = path.join(publicDir, 'mockServiceWorker.js');
if (!fs.existsSync(serviceWorkerPath)) {
  console.log('mockServiceWorker.js is missing. Initializing MSW service worker...');
  try {
    execSync('npx msw init public --save', { stdio: 'inherit' });
  } catch (error) {
    console.error('Failed to initialize MSW service worker:', error);
  }
}
