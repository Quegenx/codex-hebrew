import {expect, test} from 'bun:test';
import {polishHebrew, safePolish} from '../../scripts/translation/hebrew-ui-style.mjs';

test('keeps visible brand names in Hebrew and turns generic chat into שיחה', () => {
  expect(polishHebrew('יציאה מ-צ׳אט ג׳יפיטי')).toBe('יציאה מצ׳אט ג׳יפיטי');
  expect(polishHebrew('הצ׳אט הקולי כבר פעיל')).toBe('השיחה הקולית כבר פעיל');
  expect(polishHebrew('שכפול', {source: 'Copy'})).toBe('העתקה');
  expect(safePolish('Copy', 'שכפול')).toBe('העתקה');
  expect(safePolish('Undo', 'ביטול פעולה')).toBe('ביטול');
});

test('preserves translated compact model picker labels', () => {
  expect(polishHebrew('ג׳יפיטי 6 אסטרה\u00a0', {restoreGpt: false, keepTrailingNbsp: true})).toBe('ג׳יפיטי 6 אסטרה\u00a0');
});

test('translates leftover English UI fragments', () => {
  expect(polishHebrew('פתיחת ה־pull request המקושר')).toBe('פתיחת בקשת המשיכה המקושרת');
  expect(polishHebrew('ChatGPT for Edge')).toBe('צ׳אט ג׳יפיטי ל־אדג׳');
  expect(polishHebrew('שימוש ב---force-with-lease בעת דחיפה')).toBe('שימוש ב־--force-with-lease בעת דחיפה');
  expect(safePolish('Python', 'Python')).toBe('פייתון');
  expect(safePolish('Codex Dark', 'Codex Dark')).toBe('קודקס כהה');
  expect(safePolish('Atlassian Rovo', 'אטלסsian Rovo')).toBe('אטלסיאן רובו');
  expect(safePolish('Stripe', 'Stripe')).toBe('סטרייפ');
});

test('preserves replacement tokens inside protected code and URLs',()=>{
  const text='בדקו `echo $& $$ $1` וגם https://example.com/?value=$&';
  expect(polishHebrew(text)).toBe(text);
});
