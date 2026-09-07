<div dir="rtl">

# <span dir="ltr">Codex Hebrew</span>

התאמה קהילתית ולא רשמית של ChatGPT Desktop לעברית ולממשק מימין לשמאל עבור Mac עם Apple Silicon.

Codex Hebrew מתקין עותק נפרד בשם **צ׳אט ג׳יפיטי בעברית**. היישום המקורי ב־<code dir="ltr">/Applications/ChatGPT.app</code> והפרופיל הרגיל שלו אינם משתנים. לעותק העברי יש יישום, פרופיל והגדרות משלו, ולכן אפשר להשתמש בשתי הגרסאות במקביל.

![מסך הכניסה בעברית](reports/visual-macos/installed/login.png)

## התקנה

**[הורדת המתקין למק](https://github.com/Quegenx/codex-hebrew/releases/download/v0.1.1/Codex-Hebrew-macOS-arm64.dmg)**

צריך להוריד רק את קובץ ה־DMG. שאר הקבצים בעמוד ההפצה מיועדים לאימות טכני או לעיון בקוד המקור ואינם נחוצים להתקנה.

1. הורידו את המתקין מהקישור למעלה.
2. פתחו את קובץ ה־DMG.
3. הפעילו את **<span dir="ltr">Install Codex Hebrew</span>** ולחצו **<span dir="ltr">Install</span>**.

זה הכול. בסיום ההתקנה **צ׳אט ג׳יפיטי בעברית** ייפתח אוטומטית ויישאר בתיקיית היישומים שלכם.

נדרש Mac עם Apple Silicon ו־macOS 13 ומעלה, ועליו ChatGPT Desktop בגרסה <code dir="ltr">26.901.51231</code> מותקן.

היישום מותקן ב־<code dir="ltr">~/Applications/צ׳אט ג׳יפיטי בעברית.app</code>. הפרופיל, הגדרות Codex וקובצי ההרצה נשמרים תחת <code dir="ltr">~/Library/Application Support/ChatGPT Hebrew/</code>. בהפעלה הראשונה ייתכן שתידרש התחברות מחדש.

המתקין הניסיוני חתום מקומית ואינו מאושר ב־Apple Notarization. אם macOS חוסם את הפתיחה ואתם סומכים על ההורדה, פתחו **<span dir="ltr">System Settings → Privacy &amp; Security</span>** ובחרו **<span dir="ltr">Open Anyway</span>**. פתיחה לאחר הורדה עדיין לא נבדקה על Mac נקי.

## שימוש ועדכונים

היישום העברי והיישום המקורי פועלים בנפרד. כדי לחזור לממשק הרגיל, פתחו את ChatGPT המקורי.

היישום המקורי ממשיך לקבל עדכונים מ־OpenAI. העותק העברי אינו מפעיל את מנגנון העדכון הרשמי, מפני שעדכון כזה יחליף את הקבצים המותאמים. לאחר עדכון ChatGPT, העותק העברי הקיים נשאר בגרסה שלו. כאשר מתפרסם מתקין Codex Hebrew תואם, סגרו את היישום העברי והריצו את המתקין החדש. ההתקנה מחדש שומרת את הפרופיל ואת ההגדרות ומסרבת לשנות את היישום אם גרסת המקור אינה תואמת.

חלק מהתפריטים שייכים ל־macOS ועשויים להישאר בשפת המערכת. הבדיקה החזותית הנוכחית מכסה את מסך הכניסה; כל המסכים והמצבים עדיין אינם מאומתים.

## הסרה

להסרת היישום בלבד, מחקו את <code dir="ltr">~/Applications/צ׳אט ג׳יפיטי בעברית.app</code>. הפרופיל וההגדרות יישארו להתקנה עתידית.

להסרה מלאה, סגרו תחילה את היישום ומחקו גם את <code dir="ltr">~/Library/Application Support/ChatGPT Hebrew/</code>. פעולה זו מוחקת את הפרופיל הנפרד ואת הגדרות Codex Hebrew.

## פיתוח

הוראות לבניית המתקין ולאימותו נמצאות ב־[docs/BUILD_INSTALLERS.md](docs/BUILD_INSTALLERS.md). מגבלות הארכיטקטורה והראיות שנאספו מתועדות ב־[docs/feasibility.md](docs/feasibility.md) וב־[reports/RUNTIME.md](reports/RUNTIME.md).

## רישיון

קוד הפרויקט מופץ ברישיון [MIT](LICENSE). שמות, סימנים מסחריים, נכסי צד שלישי וחומר שמקורו ביישום ChatGPT אינם נכללים ברישיון; ראו [NOTICE.md](NOTICE.md).

</div>
