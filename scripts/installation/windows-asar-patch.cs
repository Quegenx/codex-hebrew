using System;
using System.IO;

// CHD1: ordered source-copy ranges and small MSDelta chunks, bounded to one ASAR.
internal static class WindowsAsarPatch {
 internal static byte[] Apply(byte[] source,byte[] patch){
  using(var input=new MemoryStream(patch))using(var reader=new BinaryReader(input)){
   if(reader.ReadUInt32()!=0x31444843)throw new InvalidDataException("Unknown ASAR delta format");
   int size=reader.ReadInt32(),count=reader.ReadInt32();if(size<0||count<1||count>1000000)throw new InvalidDataException("Invalid ASAR delta size");
   using(var output=new MemoryStream(size)){
    for(int i=0;i<count;i++){
     byte type=reader.ReadByte();long offset=reader.ReadInt64();int length=reader.ReadInt32(),targetLength=reader.ReadInt32(),deltaLength=reader.ReadInt32();
     if(offset<0||length<0||offset>source.LongLength-length||targetLength<0||targetLength>size-output.Length||deltaLength<0||deltaLength>input.Length-input.Position)throw new InvalidDataException("ASAR delta range is outside its source or target");
     if(type==0){if(length!=targetLength||deltaLength!=0)throw new InvalidDataException("Invalid ASAR copy range");output.Write(source,(int)offset,length);}
     else if(type==1){var original=new byte[length];Buffer.BlockCopy(source,(int)offset,original,0,length);byte[] result=WindowsDelta.Transform(original,reader.ReadBytes(deltaLength),false);if(result.Length!=targetLength)throw new InvalidDataException("ASAR chunk size mismatch");output.Write(result,0,result.Length);}
     else throw new InvalidDataException("Unknown ASAR delta operation");
    }
    if(output.Length!=size||input.Position!=input.Length)throw new InvalidDataException("ASAR delta length mismatch");return output.ToArray();
   }
  }
 }
}
