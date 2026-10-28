const decode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
export async function verifyAccessToken(token,env,keys){try{
 const parts=token.split('.');if(parts.length!==3)return null;
 const header=JSON.parse(new TextDecoder().decode(decode(parts[0]))),claims=JSON.parse(new TextDecoder().decode(decode(parts[1]))),now=Math.floor(Date.now()/1000),allowed=JSON.parse(env.ACCESS_ALLOWED_EMAILS||'[]');
 if(header.alg!=='RS256'||claims.iss!==`https://${env.ACCESS_TEAM}`||!Array.isArray(claims.aud)||!claims.aud.includes(env.ACCESS_AUD)||!Number.isFinite(claims.exp)||claims.exp<=now||(claims.nbf&&claims.nbf>now)||!allowed.includes(claims.email))return null;
 const jwk=keys.find(k=>k.kid===header.kid);if(!jwk)return null;const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 return await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]))?claims.email:null;
}catch{return null;}}
