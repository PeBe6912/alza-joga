import test from 'node:test';
import assert from 'node:assert/strict';

test('lesson confirmation uses personal email, records results and never retries an uncertain send', async () => {
  const oldDeno=globalThis.Deno,oldFetch=globalThis.fetch;
  const calls=[],mails=[];let outcome='success';
  globalThis.Deno={env:{get:key=>({SUPABASE_URL:'https://mock.invalid',SUPABASE_SERVICE_ROLE_KEY:'fake',BREVO_API_KEY:'fake',BREVO_SENDER_EMAIL:'studio@example.invalid',PUBLIC_SITE_URL:'https://joganahallu.cz'})[key]}};
  globalThis.fetch=async(url,init)=>{
    const body=JSON.parse(init.body);calls.push({url:String(url),body});
    if(String(url).includes('admin_confirm_low_attendance'))return Response.json({title:'Ranní Vinyasa',starts_at:'2026-11-02T06:45:00Z',teacher:'Petr Bena',location:'HALL',booked_count:4,minimum_attendance:5,participants:outcome==='empty'?[]:[{reservation_id:'r',name:'Petr Bena',email:'student@example.invalid'}]});
    if(String(url).includes('smtp/email')){mails.push(body);if(outcome==='uncertain')throw Error('NETWORK_TIMEOUT');return outcome==='rejected'?Response.json({message:'Rejected'},{status:400}):Response.json({messageId:'provider-message'});}
    return Response.json(null);
  };
  try {
    const {confirmLessonAndNotify}=await import('../supabase/functions/_shared/lesson-confirmation.ts');
    let result=await confirmLessonAndNotify('lesson');assert.equal(result.notified,1);assert.equal(result.failed,0);
    assert.equal(mails[0].subject,'Lekce se koná: Ranní Vinyasa');assert.match(mails[0].htmlContent,/Ahoj Petře/);assert.match(mails[0].htmlContent,/se koná i v menším počtu/);assert.match(mails[0].htmlContent,/Lektor: Petr/);assert.equal(mails[0].to[0].email,'student@example.invalid');
    assert.equal(calls.at(-1).body.p_sent,true);assert.equal(calls.at(-1).body.p_message_id,'provider-message');
    outcome='empty';result=await confirmLessonAndNotify('lesson');assert.equal(result.notified,0);assert.equal(mails.length,1);
    outcome='rejected';result=await confirmLessonAndNotify('lesson');assert.equal(result.failed,1);assert.equal(calls.at(-1).body.p_sent,false);
    outcome='uncertain';result=await confirmLessonAndNotify('lesson');assert.equal(result.failed,1);assert.ok(calls.at(-1).url.includes('smtp/email'),'Uncertain outcome must leave its claim locked');
  }finally{globalThis.Deno=oldDeno;globalThis.fetch=oldFetch;}
});
