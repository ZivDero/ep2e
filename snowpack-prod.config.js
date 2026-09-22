/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    src: { url: '/dist' },
  },
  // Compendium sources are compiled into ./packs by `npm run pack`; don't ship the raw JSON.
  exclude: ['**/src/packs/**'],
  plugins: [
    '@snowpack/plugin-babel',
    '@snowpack/plugin-dotenv',
    // '@snowpack/plugin-typescript',
    ['./snowpack-tagged-scss.js', { compilerOptions: { style: 'compressed' } }],
  ],
  optimize: {
    treeshake: true,
    entrypoints: ['src/index.ts'],
    bundle: true,
    minify: true,
    target: 'es2020',
  },
  packageOptions: {
    rollup: {
      plugins: [
        require('rollup-plugin-license')({
          sourcemap: true,
          thirdParty: {
            output: 'build/.licenses.txt',
          },
        }),
      ],
    },
  },
  buildOptions: {
    clean: true,
    /* ... */
  },
  alias: {
    '@src': './src',
    /* ... */
  },
};
