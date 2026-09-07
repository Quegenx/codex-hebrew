import {fileURLToPath} from 'node:url';
import {readHebrewCatalog} from '../translation/hebrew-catalog.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const routes={'/':'ui/preview.html','/adapter.js':'ui/rtl-adapter.js','/rtl.css':'ui/rtl.css'};
const server=Bun.serve({hostname:'127.0.0.1',port:4177,async fetch(request){
  const pathname=new URL(request.url).pathname;
  if(pathname==='/translations.json') {
    const catalog=readHebrewCatalog();
    return Response.json(Object.fromEntries(catalog.messages.filter(m=>m.descriptorKind!=='messageId'&&['draft','approved'].includes(m.status)&&m.translation).map(m=>[m.id,m.translation])));
  }
  if(routes[pathname]) return new Response(Bun.file(root+routes[pathname]));
  return new Response('Not found',{status:404});
}});
console.log(`Local RTL preview: ${server.url}`);
