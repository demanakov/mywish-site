const url = process.env.TEST_URL ?? 'http://localhost:3000';
let ready=false;
for(let i=0;i<60;i++){try{if((await fetch(url)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}
if(!ready)throw new Error('Server not ready: '+url);
