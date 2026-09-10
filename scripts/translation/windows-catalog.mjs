// Carry a translation across versions only when both its ID and source agree.
export function createWindowsCatalog(source,canonical){
 const existing=new Map(canonical.messages.map(message=>[message.id,message]));
 const messages=[],missing=[];
 for(const message of source.messages){
  const prior=existing.get(message.id);
  if(prior?.source===message.source&&prior.translation&&['draft','approved'].includes(prior.status))messages.push({...message,translation:prior.translation,status:prior.status});
  else missing.push({id:message.id,source:message.source,reason:prior?'changed-or-untranslated':'new'});
 }
 return{catalog:{...canonical,archiveSha256:source.archiveSha256,messages},coverage:{sourceMessages:source.messages.length,reusedMessages:messages.length,missing}};
}
