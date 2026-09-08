import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isUserRole, roleHome, roleLabel } from "./roles.ts";

const source=(path:string)=>readFileSync(new URL(path,import.meta.url),"utf8");
const actions=source("../../app/auth/actions.ts");
const header=source("../../components/layout/site-header.tsx");
const proxy=source("../../proxy.ts");
const proxyClient=source("../supabase/proxy.ts");
const serverClient=source("../supabase/server.ts");

test("cada role possui destino e rótulo próprios",()=>{
  assert.deepEqual(roleHome,{consumer:"/consumidor",merchant:"/comerciante",admin:"/admin"});
  assert.deepEqual(roleLabel,{consumer:"Consumidor",merchant:"Comerciante",admin:"Administrador"});
  assert.equal(isUserRole("admin"),true);assert.equal(isUserRole("visitor"),false);
});
test("login e logout invalidam o layout derivado da sessão",()=>{
  assert.match(actions,/signInWithPassword/);assert.match(actions,/signOut\(\{ scope: "local" \}\)/);
  assert.ok((actions.match(/revalidatePath\("\/", "layout"\)/g)?.length??0)>=3);
  assert.match(actions,/redirect\(roleHome\[profile\.role\]\)/);assert.match(actions,/redirect\("\/login"\)/);
});
test("header deriva autenticação do servidor e oferece logout real",()=>{
  assert.match(header,/supabase\.auth\.getUser\(\)/);assert.doesNotMatch(header,/getSession\(/);
  assert.match(header,/profile\.role/);assert.match(header,/action=\{logoutAction\}/);
});
test("cookies e rotas protegidas usam a mesma sessão Supabase",()=>{
  assert.match(serverClient,/getAll:/);assert.match(serverClient,/setAll\(/);
  assert.match(proxy,/updateSession\(request\)/);assert.match(proxyClient,/supabase\.auth\.getUser\(\)/);assert.match(proxy,/expectedRole !== profile\.role/);
  assert.match(proxy,/NextResponse\.redirect\(new URL\("\/login"/);
});
