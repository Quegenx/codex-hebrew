import {simple} from 'acorn-walk';
export function readStringLiteral(n) {
  if(n?.type==='Literal'&&typeof n.value==='string')return n.value;
  if(n?.type==='TemplateLiteral'&&!n.expressions.length)return n.quasis[0].value.cooked;
}
// Conservative whole-file resolution: reject shadowed, reassigned and dynamic names.
export function literalResolver(ast){
  const values=new Map(),seen=new Set();
  function bind(name,value){if(seen.has(name))values.delete(name);else{seen.add(name);if(typeof value==='string')values.set(name,value);}}
  function names(pattern,callback){if(!pattern)return;if(pattern.type==='Identifier')callback(pattern.name);else if(pattern.type==='RestElement')names(pattern.argument,callback);else if(pattern.type==='AssignmentPattern')names(pattern.left,callback);else if(pattern.type==='ArrayPattern')pattern.elements.forEach(p=>names(p,callback));else if(pattern.type==='ObjectPattern')pattern.properties.forEach(p=>names(p.type==='RestElement'?p.argument:p.value,callback));}
  function fn(n){if(n.id)bind(n.id.name);for(const p of n.params)names(p,name=>bind(name));}
  simple(ast,{
    VariableDeclarator(n){names(n.id,name=>bind(name,n.id.type==='Identifier'?readStringLiteral(n.init):undefined));},
    FunctionDeclaration:fn,FunctionExpression:fn,ArrowFunctionExpression:fn,
    CatchClause(n){names(n.param,name=>bind(name));},
    ImportDeclaration(n){n.specifiers.forEach(s=>bind(s.local.name));},
    AssignmentExpression(n){names(n.left,name=>bind(name));},UpdateExpression(n){names(n.argument,name=>bind(name));},
  });
  return n=>readStringLiteral(n)??(n?.type==='Identifier'?values.get(n.name):undefined);
}
