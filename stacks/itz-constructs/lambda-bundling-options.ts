import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";

export const lambdaBundlingOptions: nodejs.NodejsFunctionProps["bundling"] = {
  minify: false,
  sourceMap: true,
  sourceMapMode: nodejs.SourceMapMode.EXTERNAL,
  keepNames: true,
  metafile: true,
  banner: `import { createRequire } from 'module';const require = createRequire(import.meta.url);`, // https://github.com/evanw/esbuild/issues/1232
  externalModules: [],
  format: nodejs.OutputFormat.ESM,
  mainFields: ["module", "main"],
};
