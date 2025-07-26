import * as esbuild from 'esbuild'

async function watch() {
    const ctx = await esbuild.context({
        entryPoints: ['src/index.tsx'],
        bundle: true,
        minify: true,
        format: 'cjs',
        sourcemap: true,
        outfile: 'dist/output.js',
        // external: ['react', 'react-dom'], 
    })
    await ctx.watch();
    console.log('Watching...');
}

watch()
