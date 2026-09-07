import fs from 'node:fs';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {openAsar} from '../analysis/asar-archive.mjs';
import {adaptationFingerprint} from './translation-coverage.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),archive=process.argv[2]||'/Applications/ChatGPT.app/Contents/Resources/app.asar';
const report=JSON.parse(fs.readFileSync(`${root}reports/visual-macos.json`,'utf8'));
const current=report.archiveSha256===openAsar(archive).hash&&report.adaptationSha256===adaptationFingerprint(root);
const artifacts=report.captures.every(capture=>{const file=`${root}${capture.file}`;return fs.existsSync(file)&&crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')===capture.sha256;});
const required=report.requirements.every(requirement=>requirement.widths.every(width=>report.captures.some(capture=>capture.state===requirement.state&&capture.theme===requirement.theme&&capture.window.width===width)));
const observations=report.captures.every(capture=>capture.observations&&Object.values(capture.observations).every(value=>value===true||value==='not-applicable'));
const complete=current&&artifacts&&required&&observations;
console.log(JSON.stringify({complete,current,artifacts,required,observations,captures:report.captures.length,evidence:'reports/visual-macos.json'}));if(!complete)process.exitCode=1;
