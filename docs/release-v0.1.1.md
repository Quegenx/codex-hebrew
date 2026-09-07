<div dir="rtl">

# צ׳אט ג׳יפיטי בעברית — גרסה <span dir="ltr">0.1.1</span>

**[הורדת המתקין למק](https://github.com/Quegenx/codex-hebrew/releases/download/v0.1.1/Codex-Hebrew-macOS-arm64.dmg)**

צריך להוריד רק את קובץ ה־DMG. קובצי האימות וקוד המקור אינם נחוצים להתקנה.

1. הורידו ופתחו את קובץ ה־DMG.
2. הפעילו את **<span dir="ltr">Install Codex Hebrew</span>** ולחצו **<span dir="ltr">Install</span>**.
3. בסיום ההתקנה, **צ׳אט ג׳יפיטי בעברית** ייפתח אוטומטית.

נדרש מק עם <span dir="ltr">Apple Silicon</span> ומערכת <span dir="ltr">macOS 13</span> ומעלה, ועליו <span dir="ltr">ChatGPT Desktop</span> בגרסה <code dir="ltr">26.901.51231</code> מותקן ב־<code dir="ltr">/Applications/ChatGPT.app</code>.

המתקין יוצר עותק נפרד בתיקיית היישומים של המשתמש ושומר את הפרופיל ואת ההגדרות הקיימות של העותק העברי. היישום המקורי אינו משתנה. העותק העברי כולל תפריטים מימין לשמאל ואינו מפעיל את מנגנון העדכון הרשמי. עדכונים יופצו באמצעות מתקין עברי תואם.

המתקין ניסיוני, חתום מקומית ואינו מאושר ב־<span dir="ltr">Apple Notarization</span>. אם המערכת חוסמת את הפתיחה ואתם סומכים על ההורדה, פתחו **<span dir="ltr">System Settings → Privacy &amp; Security</span>** ובחרו **<span dir="ltr">Open Anyway</span>**. פתיחה לאחר הורדה על מק נקי ובדיקת <span dir="ltr">Gatekeeper</span> עדיין לא בוצעו, ולכן זו גרסת קדם־הפצה.

<details>
<summary>פרטים טכניים ואימות ההורדה — לא נדרשים להתקנה</summary>

המתקין נבנה מהשינוי <code dir="ltr">b6bebdb7b25e3ecac72f4f297bf03a91788393ca</code>. בדיקות הקבלה של המתקין, 62 בדיקות הקוד, בדיקת מבנה הפרויקט ואימות ההורדה עברו בהצלחה. פתיחה מלאה של הממשק לא נבדקה במסגרת בדיקות הקבלה.

קובץ <code dir="ltr">release-manifest.json</code> מתעד את גרסת היעד ואת מצב החתימה. קובץ <code dir="ltr">SHA256SUMS</code> מאפשר לוודא שההורדה תואמת למתקין שפורסם. אין צורך להוריד אותם כדי להתקין.

לבדיקה אופציונלית, הורידו את קובץ האימות לאותה תיקייה שבה נמצא המתקין והריצו מתוכה:

<div dir="ltr">

```sh
shasum -a 256 -c SHA256SUMS
```

</div>

</details>

</div>
