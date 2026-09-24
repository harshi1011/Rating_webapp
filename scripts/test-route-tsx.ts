import fs from "fs";
const envText = fs.readFileSync(".env.local","utf8");
for(const l of envText.split("\n")){const m=l.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/); if(m) process.env[m[1]]=m[2].replace(/^["']|["']$/g,"");}

async function test() {
  console.log("=== Direct route handler test ===");
  // Clear before - dynamic import after env loaded
  const { POST } = await import("../app/api/ratings/route");
  const { getSql } = await import("../lib/db");
  const sql = getSql();
  await sql`DELETE FROM ratings WHERE thought_id IN (1,2)`;

  const mkReq = (body:any) => new Request("http://localhost/api/ratings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const cases = [
    { name: "valid", body: { thought_id: 1, rating: 5, comment: "Direct handler test" }, expect: 201 },
    { name: "rating 0", body: { thought_id: 1, rating: 0 }, expect: 400 },
    { name: "whitespace comment", body: { thought_id: 1, rating: 3, comment: "   " }, expect: 201 },
  ];
  for (const c of cases) {
    const req = mkReq(c.body);
    const res = await POST(req);
    const json = await res.json();
    console.log(`${c.name}: status ${res.status} (expect ${c.expect}) ->`, res.status===c.expect ? "PASS" : "FAIL", json);
  }
}
test().catch(e=>{console.error(e); process.exit(1)});
