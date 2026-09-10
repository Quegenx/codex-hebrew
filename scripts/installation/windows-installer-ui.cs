using System;
using System.IO;
using System.Drawing;
using System.Diagnostics;
using System.Reflection;
using System.Threading.Tasks;
using System.Windows.Forms;

internal sealed class WindowsInstallerForm : Form {
 readonly TextBox source=new TextBox();readonly Label status=new Label();readonly Button install=new Button(),browse=new Button(),launch=new Button();
 readonly CheckBox shared=new CheckBox();readonly ProgressBar progress=new ProgressBar();bool busy;
 internal WindowsInstallerForm(){
  Text="התקנת Codex בעברית";Font=new Font("Segoe UI",10);ClientSize=new Size(700,460);FormBorderStyle=FormBorderStyle.FixedDialog;MaximizeBox=false;StartPosition=FormStartPosition.CenterScreen;RightToLeft=RightToLeft.Yes;RightToLeftLayout=true;
  Icon=Icon.ExtractAssociatedIcon(Assembly.GetExecutingAssembly().Location);BackColor=Color.FromArgb(249,248,245);
  var heading=new Label{Text="Codex בעברית",Font=new Font("Segoe UI",23,FontStyle.Bold),Bounds=new Rectangle(28,22,640,52)};
  var intro=new Label{Text="התקנה אישית של הגרסה בעברית, על בסיס Codex המותקן במחשב.",Bounds=new Rectangle(28,80,640,35)};
  var sourceLabel=new Label{Text="קובץ ההפעלה של Codex המקורי",Bounds=new Rectangle(28,125,640,25)};
  source.SetBounds(28,156,544,30);source.RightToLeft=RightToLeft.No;source.Font=new Font("Segoe UI",9);
  browse.Text="בחירה…";browse.SetBounds(584,154,88,32);browse.Click+=(s,e)=>{using(var dialog=new OpenFileDialog{Filter="Codex (ChatGPT.exe)|ChatGPT.exe",Title="בחירת Codex המקורי"})if(dialog.ShowDialog(this)==DialogResult.OK)source.Text=dialog.FileName;};
  shared.Text="שימוש בשיחות ובפרויקטים המקוריים, ללא העתקה";shared.SetBounds(28,204,640,32);shared.Checked=true;
  var info=new Label{Text="נתונים משותפים: יש לסגור את Codex המקורי לפני פתיחת הגרסה בעברית.\nהתוכנה מותקנת בתיקיית התוכניות של המשתמש.",Bounds=new Rectangle(28,242,640,48),ForeColor=Color.DimGray};
  status.SetBounds(28,304,640,54);status.Text="מזהה את התקנת Codex…";
  progress.SetBounds(28,369,640,8);progress.Style=ProgressBarStyle.Marquee;progress.Visible=false;
  install.Text="התקנה";install.SetBounds(28,400,130,36);install.Enabled=false;install.Click+=InstallClick;
  launch.Text="פתיחת Codex בעברית";launch.SetBounds(178,400,190,36);launch.Visible=false;launch.Click+=(s,e)=>{Process.Start(new ProcessStartInfo(Path.Combine(WindowsInstallPaths.DefaultRoot,"Codex Hebrew.exe")){UseShellExecute=true});Close();};
  var close=new Button{Text="סגירה",Bounds=new Rectangle(558,400,110,36)};close.Click+=(s,e)=>Close();
  Controls.AddRange(new Control[]{heading,intro,sourceLabel,source,browse,shared,info,status,progress,install,launch,close});AcceptButton=install;
  FormClosing+=(s,e)=>{if(busy)e.Cancel=true;};Shown+=async(s,e)=>{
   try{source.Text=await Task.Run(()=>WindowsInstaller.DetectSource());var data=WindowsInstaller.FindSharedData();shared.Checked=data!=null;shared.Enabled=data!=null;
    if(Directory.Exists(WindowsInstallPaths.DefaultRoot)){shared.Checked=File.Exists(Path.Combine(WindowsInstallPaths.DefaultRoot,"shared-data.json"));shared.Enabled=false;shared.Text=shared.Checked?"ההגדרה הקיימת לשיתוף שיחות תישמר":"הנתונים הנפרדים של ההתקנה הקיימת יישמרו";}
    status.Text=source.Text.Length>0?"Codex זוהה. גרסה נתמכת: "+WindowsInstaller.ReadPayload().packageVersion:"Codex לא זוהה. יש להתקין את הגרסה הנתמכת או לבחור את הקובץ ידנית.";
   }catch(Exception error){status.Text="הזיהוי האוטומטי לא הצליח. אפשר לבחור את הקובץ ידנית. "+error.Message;}
   install.Enabled=true;
  };
 }
 async void InstallClick(object sender,EventArgs args){
  string executable=source.Text.Trim();if(executable.Length==0){MessageBox.Show(this,"יש לבחור את קובץ ההפעלה של Codex המקורי.",Text);return;}
  busy=true;install.Enabled=browse.Enabled=shared.Enabled=source.Enabled=false;progress.Visible=true;
  var selectedShared=shared.Checked?WindowsInstaller.FindSharedData():null;
  var messages=new Progress<string>(message=>status.Text=message);
  try{
   var receipt=await Task.Run(()=>WindowsInstaller.Install(executable,WindowsInstallPaths.DefaultRoot,selectedShared,message=>((IProgress<string>)messages).Report(message)));
   string extra="";try{WindowsInstallIntegration.Register(receipt.root,receipt.packageVersion);}catch(Exception error){extra="\nיצירת קיצורי הדרך לא הושלמה: "+error.Message;}
   status.Text="ההתקנה הושלמה. אפשר לפתוח את Codex בעברית."+extra;launch.Visible=true;install.Text="הותקן";
  }catch(Exception error){status.Text="ההתקנה לא הושלמה.";MessageBox.Show(this,error.Message,Text,MessageBoxButtons.OK,MessageBoxIcon.Error);install.Enabled=browse.Enabled=source.Enabled=true;shared.Enabled=WindowsInstaller.FindSharedData()!=null;}
  finally{busy=false;progress.Visible=false;}
 }
}

internal static class WindowsSetupProgram {
 [STAThread] public static int Main(string[] args){
  WindowsInstallPaths.EnableLongPaths();
  try{
   if(args.Length==2&&args[0]=="--describe"){File.WriteAllText(args[1],WindowsInstallPaths.Json(WindowsInstaller.ReadPayload()));return 0;}
   // Acceptance checks install/update a named task-local folder, without shell integration.
   if(args.Length==4&&args[0]=="--install-test"){
    string destination=WindowsInstallPaths.Normalize(args[2]);
    if(!Path.GetFileName(destination).StartsWith("codex-hebrew-test-",StringComparison.Ordinal))throw new IOException("Use a codex-hebrew-test-* directory.");
    var receipt=WindowsInstaller.Install(args[1],destination,null,message=>{});File.WriteAllText(args[3],WindowsInstallPaths.Json(receipt));return 0;
   }
   if(args.Length!=0)throw new ArgumentException("Unknown installer arguments");
   Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);Application.Run(new WindowsInstallerForm());return 0;
  }catch(Exception error){
   if(args.Length>0){if(args.Length==4)File.WriteAllText(args[3],WindowsInstallPaths.Json(new{error=error.Message}));return 1;}
   MessageBox.Show(error.Message,"התקנת Codex בעברית",MessageBoxButtons.OK,MessageBoxIcon.Error);return 1;
  }
 }
}
