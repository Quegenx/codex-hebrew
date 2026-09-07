import {test,expect} from 'bun:test';
import {parse} from 'acorn';
import {literalResolver} from '../../scripts/analysis/literal-bindings.mjs';
function resolve(source,name){return literalResolver(parse(source,{ecmaVersion:'latest',sourceType:'module'}))({type:'Identifier',name});}
test('resolves fixed ID and default message variables',()=>{expect(resolve('var title=`About {appName}`;','title')).toBe('About {appName}');});
test('rejects shadows, assignments and dynamic initializers',()=>{
  expect(resolve('const title="About";function f(title){return title}','title')).toBeUndefined();
  expect(resolve('var title="About";title="Other";','title')).toBeUndefined();
  expect(resolve('const title=translate();','title')).toBeUndefined();
  expect(resolve('function f({title}){}const title="About";','title')).toBeUndefined();
});
