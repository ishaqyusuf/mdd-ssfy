import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function patchPreviewServer() {
  let packageJsonPath;
  try {
    packageJsonPath = require.resolve('@react-email/preview-server/package.json', {
      paths: [process.cwd()],
    });
  } catch {
    console.warn('[email patch] @react-email/preview-server is not installed.');
    return;
  }

  const previewServerRoot = path.dirname(packageJsonPath);
  const filePath = path.join(
    previewServerRoot,
    'src/app/preview/[...slug]/email-frame.tsx',
  );

  if (!fs.existsSync(filePath)) {
    console.warn(`[email patch] File not found: ${filePath}`);
    return;
  }

  let source = fs.readFileSync(filePath, 'utf8');

  if (source.includes('const { body } = contentDocument;')) {
    console.log('[email patch] Preview server patch already applied.');
    return;
  }

  source = source.replace(
    "  if (!contentDocument || !contentWindow) return;\n\n  const appliedColorInversion = contentDocument.body.hasAttribute(\n    'data-applied-color-inversion',\n  );",
    "  if (!contentDocument || !contentWindow) return;\n  const { body } = contentDocument;\n  if (!body) return;\n\n  const appliedColorInversion = body.hasAttribute(\n    'data-applied-color-inversion',\n  );",
  );

  source = source.replace(
    "  contentDocument.body.removeAttribute('data-applied-color-inversion');",
    "  body.removeAttribute('data-applied-color-inversion');",
  );

  source = source.replace(
    "  if (!contentDocument || !contentWindow) return;\n\n  const appliedColorInversion = contentDocument.body.hasAttribute(\n    'data-applied-color-inversion',\n  );\n  if (appliedColorInversion) return;\n  contentDocument.body.setAttribute('data-applied-color-inversion', '');\n\n  if (!contentDocument.body.style.color) {\n    contentDocument.body.style.color = 'rgb(0, 0, 0)';\n  }\n  if (\n    !contentDocument.body.style.background &&\n    !contentDocument.body.style.backgroundColor\n  ) {\n    contentDocument.body.style.background = 'rgb(255, 255, 255)';\n  }",
    "  if (!contentDocument || !contentWindow) return;\n  const { body } = contentDocument;\n  if (!body) return;\n\n  const appliedColorInversion = body.hasAttribute(\n    'data-applied-color-inversion',\n  );\n  if (appliedColorInversion) return;\n  body.setAttribute('data-applied-color-inversion', '');\n\n  if (!body.style.color) {\n    body.style.color = 'rgb(0, 0, 0)';\n  }\n  if (!body.style.background && !body.style.backgroundColor) {\n    body.style.background = 'rgb(255, 255, 255)';\n  }",
  );

  fs.writeFileSync(filePath, source);
  console.log('[email patch] Patched @react-email/preview-server email-frame.tsx');
}

patchPreviewServer();
