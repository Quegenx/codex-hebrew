import {test,expect} from 'bun:test';
import {createWindowsCatalog} from '../../scripts/translation/windows-catalog.mjs';

test('Windows catalog reuses exact matches and excludes changed, missing and unapproved translations',()=>{
 const canonical={archiveSha256:'mac',messages:[{id:'same',source:'Open',translation:'פתח',status:'approved'},{id:'changed',source:'Old',translation:'ישן',status:'approved'},{id:'pending',source:'Pending',translation:'ממתין',status:'pending'}]};
 const snapshot=JSON.stringify(canonical);
 const source={archiveSha256:'windows',messages:[{id:'same',source:'Open'},{id:'changed',source:'New'},{id:'pending',source:'Pending'},{id:'new',source:'New entry'}]};
 const {catalog,coverage}=createWindowsCatalog(source,canonical);
 expect(catalog.archiveSha256).toBe('windows');expect(catalog.messages).toHaveLength(1);expect(catalog.messages[0].translation).toBe('פתח');
 expect(coverage.missing.map(message=>message.id)).toEqual(['changed','pending','new']);expect(JSON.stringify(canonical)).toBe(snapshot);
});
