import {test,expect} from 'bun:test';
import {fileURLToPath} from 'node:url';
import {resolveApplicationTarget} from '../../scripts/analysis/application-target.mjs';

test('application target derives the exact macOS ASAR path',()=>{
 const mac='/Applications/ChatGPT.app/Contents/MacOS/ChatGPT';
 const macFiles=new Set([mac,'/Applications/ChatGPT.app/Contents/Resources','/Applications/ChatGPT.app/Contents/Resources/app.asar']);
 expect(resolveApplicationTarget({platform:'darwin',executable:mac,exists:value=>macFiles.has(value)}).archive).toBe('/Applications/ChatGPT.app/Contents/Resources/app.asar');
});

test('application icon bounds preserve the opacity threshold and reject empty artwork',()=>{
 const script=fileURLToPath(new URL('../../scripts/build/prepare-application-icon.py',import.meta.url));
 const check=`import runpy, sys
from PIL import Image
bounds = runpy.run_path(sys.argv[1])['content_box']
image = Image.new('RGBA', (5, 4), (255, 255, 255, 16))
image.putpixel((1, 1), (0, 0, 0, 17))
image.putpixel((3, 2), (255, 255, 255, 255))
assert bounds(image) == (1, 1, 4, 3)
try:
    bounds(Image.new('RGBA', (2, 2), (255, 255, 255, 16)))
except SystemExit as error:
    assert str(error) == 'No opaque icon content after removing the black field'
else:
    raise AssertionError('Empty artwork was accepted')
`;
 const result=Bun.spawnSync([process.env.CODEX_HEBREW_PYTHON||'python3','-c',check,script],{stdout:'pipe',stderr:'pipe'});
 expect(result.stderr.toString()).toBe('');expect(result.exitCode).toBe(0);
});

test('application target fails closed when Electron resources are absent',()=>{
 expect(()=>resolveApplicationTarget({platform:'darwin',executable:'/Applications/ChatGPT.app/Contents/MacOS/ChatGPT',exists:value=>value.endsWith('/MacOS/ChatGPT')})).toThrow('No app.asar');
});

test('application target rejects unsupported platforms',()=>{
 expect(()=>resolveApplicationTarget({platform:'linux'})).toThrow('supports macOS and Windows only');
});

test('Windows target finds resources beside the executable with spaces in its path',()=>{
 const executable='C:\\Program Files\\Codex\\ChatGPT.exe';
 const archive='C:\\Program Files\\Codex\\resources\\app.asar';
 const exists=value=>[executable,archive].includes(value);
 expect(resolveApplicationTarget({platform:'win32',executable,exists}).archive).toBe(archive);
 expect(()=>resolveApplicationTarget({platform:'win32',executable,exists:value=>value===executable})).toThrow('No app.asar');
});
