using System;
using System.ComponentModel;
using System.IO;
using System.Runtime.InteropServices;

// Windows MSDelta RAW format; no redistributed patch engine or runtime install.
internal static class WindowsDelta {
 [StructLayout(LayoutKind.Sequential)] struct Input { public IntPtr Start; public UIntPtr Size; public int Editable; }
 [StructLayout(LayoutKind.Sequential)] struct Output { public IntPtr Start; public UIntPtr Size; }
 [DllImport("msdelta.dll",SetLastError=true)] static extern bool CreateDeltaB(long type,long flags,long reset,Input source,Input target,Input sourceOptions,Input targetOptions,Input globalOptions,IntPtr time,uint hash,out Output delta);
 [DllImport("msdelta.dll",SetLastError=true)] static extern bool ApplyDeltaB(long flags,Input source,Input delta,out Output target);
 [DllImport("msdelta.dll")] static extern bool DeltaFree(IntPtr memory);
 internal static byte[] Transform(byte[] source,byte[] other,bool create) {
  var a=GCHandle.Alloc(source,GCHandleType.Pinned);var b=GCHandle.Alloc(other,GCHandleType.Pinned);var output=new Output();
  try {
   var first=new Input{Start=a.AddrOfPinnedObject(),Size=(UIntPtr)source.Length};
   var second=new Input{Start=b.AddrOfPinnedObject(),Size=(UIntPtr)other.Length};
   // Ignore the default size ceiling; disable executable-call transforms for ASAR.
   bool success=create?CreateDeltaB(1,0x20000,1,first,second,new Input(),new Input(),new Input(),IntPtr.Zero,0,out output):ApplyDeltaB(0,first,second,out output);
   if(!success)throw new Win32Exception(Marshal.GetLastWin32Error(),"Windows delta operation failed");
   int size=checked((int)output.Size.ToUInt64());var bytes=new byte[size];Marshal.Copy(output.Start,bytes,0,size);return bytes;
  }finally{if(output.Start!=IntPtr.Zero)DeltaFree(output.Start);a.Free();b.Free();}
 }
}

internal static class WindowsDeltaTool {
 public static int Main(string[] args) {
  try{if(args.Length!=4||(args[0]!="create"&&args[0]!="apply"))throw new ArgumentException("Pass create/apply, source, target/delta, output");
   File.WriteAllBytes(args[3],WindowsDelta.Transform(File.ReadAllBytes(args[1]),File.ReadAllBytes(args[2]),args[0]=="create"));return 0;
  }catch(Exception error){Console.Error.WriteLine(error);return 1;}
 }
}

internal static class WindowsAsarDeltaTool {
 public static int Main(string[] args){try{if(args.Length!=3)throw new ArgumentException("Pass source, ASAR delta, output");File.WriteAllBytes(args[2],WindowsAsarPatch.Apply(File.ReadAllBytes(args[0]),File.ReadAllBytes(args[1])));return 0;}catch(Exception error){Console.Error.WriteLine(error);return 1;}}
}
