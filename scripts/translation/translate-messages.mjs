import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {signature} from './icu-signature.mjs';
import {hebrewUiTranslationInstructions} from './hebrew-ui-style.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const locale = process.argv[2] || 'he';
const limit = Number(process.argv[3] || 3);
if (!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale) || !Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error('Usage: translate [locale] [1..50]');
if(locale!=='he')throw new Error('This project has one canonical Hebrew catalog');
if(fs.existsSync(`${root}reports/bulk-${locale}.lock`))throw new Error('Wait for the active bulk translation before starting a sample translation.');
const file = `${root}catalogs/hebrew.json`;
const before = fs.readFileSync(file, 'utf8');
const catalog = JSON.parse(before);
const sources = new Map(JSON.parse(fs.readFileSync(`${root}catalogs/source/en.json`, 'utf8')).messages.map(m => [m.id,m]));
const requested = process.argv[4] ? new Set(process.argv[4].split(',')) : null;
if (requested && [...requested].some(id => !sources.has(id))) throw new Error('Unknown requested message ID');
const selection = catalog.messages.filter(m => (!requested || requested.has(m.id)) && m.status === 'untranslated' && !m.translation && sources.get(m.id)?.sourceHash === m.sourceHash).slice(0,limit);
if (!selection.length) {console.log('No untranslated entries.');process.exit(0);}
if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL) throw new Error('Set OPENAI_API_KEY and OPENAI_MODEL in .env');
const config = JSON.parse(fs.readFileSync(`${root}config/translation.json`, 'utf8'));
const messages = selection.map(m => ({id:m.id, source:m.source, context:m.description}));
const request = {
  model:process.env.OPENAI_MODEL,
  store:false,
  max_output_tokens:5000,
  reasoning:{effort:'low'},
  instructions:hebrewUiTranslationInstructions,
  input:JSON.stringify(messages),
  text:{format:{type:'json_schema',name:'translations',strict:true,schema:{type:'object',properties:{translations:{type:'array',items:{type:'object',properties:{id:{type:'string'},translation:{type:'string'}},required:['id','translation'],additionalProperties:false}}},required:['translations'],additionalProperties:false}}},
};
try {
  const response = await fetch(config.endpoint, {method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(request),redirect:'error',signal:AbortSignal.timeout(90000)});
  if (!response.ok) throw new Error(`OpenAI HTTP ${response.status}; no catalog changes.`);
  const result = await response.json();
  if (result.status !== 'completed') throw new Error('Response not completed; no catalog changes.');
  const output = (result.output || []).flatMap(item => item.type === 'message' ? item.content || [] : []);
  if (output.some(item => item.type === 'refusal')) throw new Error('Model refused; no catalog changes.');
  const payload = JSON.parse(output.filter(item => item.type === 'output_text').map(item => item.text).join(''));
  if (!Array.isArray(payload.translations) || payload.translations.length !== selection.length) throw new Error('Translation count mismatch.');
  const expected = new Map(selection.map(m => [m.id,m]));
  for (const item of payload.translations) {
    const original = expected.get(item.id);
    if (!original || typeof item.translation !== 'string' || !item.translation.trim()) throw new Error('Missing, duplicate, or invalid translation.');
    if (signature(original.source) !== signature(item.translation)) throw new Error('ICU variables/tags do not match.');
    if (/[\u202a-\u202e\u2066-\u2069]/u.test(item.translation)) throw new Error('Unexpected bidi control characters.');
    expected.delete(item.id);
    original.translation = item.translation;
    original.status = 'draft';
    original.translationModel = process.env.OPENAI_MODEL;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g,'-');
  fs.writeFileSync(`${root}reports/translation-${stamp}.json`, JSON.stringify({model:process.env.OPENAI_MODEL,locale,usage:result.usage,messages:payload.translations},null,2)+'\n');
  if (fs.readFileSync(file,'utf8') !== before) throw new Error('Catalog changed during request; result saved in reports only.');
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary,JSON.stringify(catalog,null,2)+'\n');
  fs.renameSync(temporary,file);
  console.log(`Saved ${selection.length} validated draft translations with ${process.env.OPENAI_MODEL}.`);
} catch (error) {
  // Deliberately avoid dumping network objects, request headers or model error bodies.
  console.error(error instanceof SyntaxError ? 'Invalid JSON or ICU output; catalog unchanged.' : error.message.replaceAll(process.env.OPENAI_API_KEY,'[redacted]'));
  process.exitCode=1;
}
