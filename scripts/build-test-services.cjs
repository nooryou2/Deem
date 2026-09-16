const esbuild = require('esbuild');
esbuild
  .build({
    stdin: {
      contents: `export * from './src/services/bookingService'; export * from './src/services/requestService'; export * from './src/services/quoteService'; export * from './src/services/jobStatusService'; export * from './src/services/reviewService'; export * from './src/services/maintenanceService'; export * from './tests/firebase-context';`,
      resolveDir: process.cwd(),
      loader: 'ts',
    },
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: '.test-build/services.cjs',
    packages: 'external',
    plugins: [
      {
        name: 'notifications',
        setup(build) {
          build.onResolve({ filter: /notificationService$/ }, () => ({
            path: require('path').resolve('tests/notification-stub.ts'),
          }));
        },
      },
    ],
    alias: { '@/config/firebase': './tests/firebase-context.ts' },
  })
  .catch(() => process.exit(1));
