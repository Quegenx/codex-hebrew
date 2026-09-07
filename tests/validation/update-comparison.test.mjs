import {test,expect} from 'bun:test';
import {compareUpdateCatalogs} from '../../scripts/validation/update-comparison.mjs';

test('update comparison identifies added, changed, removed, and unchanged messages',()=>{
 const baseline={messages:[{id:'same',sourceHash:'1'},{id:'changed',sourceHash:'2'},{id:'removed',sourceHash:'3'}]};
 const candidate={messages:[{id:'same',sourceHash:'1'},{id:'changed',sourceHash:'4'},{id:'added',sourceHash:'5'}]};
 expect(compareUpdateCatalogs(baseline,candidate)).toEqual({added:['added'],changed:[{id:'changed',before:'2',after:'4'}],removed:['removed'],unchanged:['same']});
});
