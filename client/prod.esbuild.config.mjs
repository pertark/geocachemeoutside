import * as esbuild from 'esbuild'

await esbuild.build({
    entryPoints: ['src/index.tsx'],
    bundle: true,
    minify: true,
    format: 'cjs',
    sourcemap: true,
    outfile: 'dist/output.js',
    // external: ['react', 'react-dom'], 
})
