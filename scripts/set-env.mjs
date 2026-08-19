import { writeFileSync } from 'node:fs';

const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';

writeFileSync(
  new URL('../src/env/env.ts', import.meta.url),
  `export const environment = {\n  production: true,\n  backendUrl: '${backendUrl}'\n};\n`,
);

console.log(`Wrote src/env/env.ts with backendUrl=${backendUrl}`);
