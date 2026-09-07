import {test,expect} from 'bun:test';
import {signature} from '../../scripts/translation/icu-signature.mjs';
test('Hebrew translations retain named variables and rich text tags',()=>{
  expect(signature('Hello <b>{name}</b>')).toBe(signature('שלום <b>{name}</b>'));
  expect(signature('Hello {name}')).not.toBe(signature('שלום {user}'));
  expect(signature('<b>Hello</b>')).not.toBe(signature('<i>שלום</i>'));
});
test('Plural categories may change by locale, exact branches and offsets may not',()=>{
  expect(signature('{n, plural, one {One} other {Many}}')).toBe(signature('{n, plural, one {אחד} two {שניים} other {רבים}}'));
  expect(signature('{n, plural, =0 {None} other {Many}}')).not.toBe(signature('{n, plural, other {רבים}}'));
  expect(signature('{n, plural, offset:1 one {One} other {Many}}')).not.toBe(signature('{n, plural, one {אחד} other {רבים}}'));
});
test('Select keys and malformed ICU are rejected',()=>{
  expect(signature('{kind, select, file {File} other {Other}}')).not.toBe(signature('{kind, select, folder {תיקייה} other {אחר}}'));
  expect(()=>signature('{name')).toThrow();
});
