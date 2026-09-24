import fs from "fs";
const env = fs.readFileSync(".env.local","utf8");
for(const l of env.split("\n")){const m=l.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/); if(m) process.env[m[1]]=m[2].replace(/^["']|["']$/g,"");}
async function run(){
  const { getSql } = await import("../lib/db");
  const sql = getSql();
  const rows = await sql`SELECT id, category, content FROM thoughts ORDER BY id`;
  console.log(`Thoughts count: ${rows.length} (expected 3)`);
  rows.forEach((r:any)=> console.log(`- ${r.id}: [${r.category}] "${r.content.slice(0,50)}..."`));
  if(rows.length!==3) throw new Error("Expected 3 thoughts");

  const { GET: getRandom } = await import("../app/api/thoughts/random/route");
  const ids = new Set<number>();
  for(let i=0;i<10;i++){
    const res:any = await (getRandom as any)(new Request("http://localhost/random"));
    const j = await res.json();
    ids.add(j.thought.id);
    if(![1,2,3].includes(j.thought.id)) throw new Error(`Random returned unexpected id ${j.thought.id}`);
  }
  console.log(`Random cycling 10 calls -> distinct IDs: ${[...ids].sort().join(", ")} (expected subset of 1,2,3) PASS`);

  const { POST: postRating } = await import("../app/api/ratings/route");
  const { GET: getVerdict } = await import("../app/api/thoughts/[id]/verdict/route");
  const mkReq = (b:any)=> new Request("http://localhost/api/ratings", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(b)});
  // clean ratings
  await sql`DELETE FROM ratings`;
  console.log("Cleared ratings");
  // post rating 5 to thought 1
  const pr = await postRating(mkReq({thought_id:1, rating:5, comment:"still works"}));
  console.log(`POST rating 5 to thought 1 -> ${pr.status} ${pr.status===201?"PASS":"FAIL"}`);
  const getV = async (id:number)=> {
    const req = new Request("http://localhost/x");
    const res:any = await (getVerdict as any)(req, {params:{id:String(id)}});
    return {status:res.status, json:await res.json()};
  };
  const v1 = await getV(1);
  console.log(`Verdict 1 -> avg=${v1.json.average_rating} count=${v1.json.total_ratings} ${v1.json.average_rating===5 && v1.json.total_ratings===1 ? "PASS" : "FAIL"}`);
  // verify invalid thought 4 should be 404
  const v4 = await getV(4);
  console.log(`Verdict 4 (should not exist) -> ${v4.status===404 ? "PASS 404" : "FAIL "+v4.status}`);

  // check header removed
  const page = fs.readFileSync("app/page.tsx","utf8");
  console.log(`Header check -> ${page.includes("No login required") ? "FAIL still present" : "PASS removed"}`);
  console.log("All checks done");
}
run().catch(e=>{console.error(e); process.exit(1)});
