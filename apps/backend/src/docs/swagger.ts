import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';

let cachedSpec: Record<string, unknown> | null = null;

/**
 * Loads and parses the OpenAPI YAML spec from disk.
 * The result is cached in memory after the first load.
 */
export function getSwaggerSpec(): Record<string, unknown> {
  if (cachedSpec) return cachedSpec;

  const candidatePaths = [
    path.resolve(__dirname, 'openapi.yaml'),
    path.resolve(process.cwd(), 'src/docs/openapi.yaml'),
    path.resolve(process.cwd(), 'dist/docs/openapi.yaml'),
  ];

  const specPath = candidatePaths.find((p) => fs.existsSync(p));

  if (!specPath) {
    throw new Error(
      `OpenAPI spec not found. Checked candidate paths: ${candidatePaths.join(', ')}`
    );
  }

  const raw = fs.readFileSync(specPath, 'utf-8');
  cachedSpec = yaml.load(raw) as Record<string, unknown>;

  return cachedSpec;
}
