const {execFile} = require('child_process');
const {build} = require('esbuild');

async function typeCheck() {
    await new Promise((resolve, reject) => {
        execFile(process.execPath, [require.resolve('typescript/lib/tsc.js'), '--project', 'src/tsconfig.json'], (err) => {
            if (err) {
                reject(new Error(`tsc has exited with error: ${err.message}`));
            } else {
                resolve();
            }
        });
    });
}



async function bundleJS(release) {
    await build({
        bundle: true,
        target: 'es2019',
        charset: 'utf8',
        format: 'iife',
        write: true,
        outfile: 'simulatie.js',
        entryPoints: ['src/simulatie.ts'],
        banner: '"use strict";',
        logLevel: 'info',
        color: true,
        sourcemap: release ? false : 'inline',
        minify: release,
    });
}

async function main() {
    const args = process.argv.slice(2);
    await typeCheck();
    await bundleJS(args.includes('--release'));
}

main();
