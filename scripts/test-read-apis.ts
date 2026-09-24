import fs from "fs";
const envText = fs.readFileSync(".env.local","utf8");
for(const l of envText.split("\n")){const m=l.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/); if(m) process.env[m[1]]=m[2].replace(/^["']|["']$/g,"");}

async function run() {
  console.log("=== M4 Read APIs Tests ===");
  const sql = (await import("../lib/db")).getSql();

  // Prepare deterministic data for verdict test
  await sql`DELETE FROM ratings`;
  console.log("Cleared ratings for deterministic verdict test");
  // Insert known ratings for thought 1: 5,3,4 => avg 4.0, count 3
  await sql`INSERT INTO ratings (thought_id, rating, comment) VALUES (1, 5, 'First comment')`;
  await new Promise(r=>setTimeout(r, 10));
  await sql`INSERT INTO ratings (thought_id, rating, comment) VALUES (1, 3, 'Second comment')`;
  await new Promise(r=>setTimeout(r, 10));
  await sql`INSERT INTO ratings (thought_id, rating, comment) VALUES (1, 4, NULL)`;
  await new Promise(r=>setTimeout(r, 10));
  await sql`INSERT INTO ratings (thought_id, rating, comment) VALUES (1, 2, 'Fourth comment with 2 stars')`;
  // thought 2: no ratings (to test empty)
  // thought 3: one rating 5 with comment
  await sql`INSERT INTO ratings (thought_id, rating, comment) VALUES (3, 5, 'Only comment for thought 3')`;

  const { GET: getThought } = await import("../app/api/thoughts/[id]/route");
  const { GET: getVerdict } = await import("../app/api/thoughts/[id]/verdict/route");
  const { GET: getRandom } = await import("../app/api/thoughts/random/route");

  // Helper to call handler
  const call = async (handler: any, params: any) => {
    const req = new Request("http://localhost/test");
    const res = await handler(req, { params });
    const json = await res.json();
    return { status: res.status, json };
  };

  // 1. GET /api/thoughts/:id valid
  let r = await call(getThought, { id: "1" });
  console.log("1 GET /api/thoughts/1:", r.status===200 && r.json.thought ? `PASS id=${r.json.thought.id} category=${r.json.thought.category}` : `FAIL ${r.status} ${JSON.stringify(r.json)}`);

  // 2. invalid id 9999
  r = await call(getThought, { id: "9999" });
  console.log("2 GET /api/thoughts/9999:", r.status===404 ? `PASS 404 ${r.json.error}` : `FAIL ${r.status}`);

  // 3. invalid id abc
  r = await call(getThought, { id: "abc" });
  console.log("3 GET /api/thoughts/abc:", r.status===400 ? `PASS 400 ${r.json.error}` : `FAIL ${r.status}`);

  // 4. GET /api/thoughts/1/verdict — should have avg 3.5? Let's compute: ratings for thought1 are 5,3,4,2 = avg 3.5, count 4
  r = await call(getVerdict, { id: "1" });
  const expectedAvg = (5+3+4+2)/4; // 3.5
  const passAvg = r.json.average_rating === expectedAvg;
  const passCount = r.json.total_ratings === 4;
  // latest_comments should be 3 (only non-null comments), ordered DESC, limit 10, most recent first: "Fourth...", "Second...", "First..."
  const comments = r.json.latest_comments || [];
  const orderOk = comments.length===3 && comments[0].comment==="Fourth comment with 2 stars" && comments[1].comment==="Second comment";
  console.log(`4 GET /api/thoughts/1/verdict: status ${r.status}`, r.status===200 ? (passAvg && passCount && orderOk ? `PASS avg=${r.json.average_rating} count=${r.json.total_ratings} comments=${comments.length} order OK` : `FAIL avg=${r.json.average_rating} (exp ${expectedAvg}) count=${r.json.total_ratings} (exp 4) comments=${JSON.stringify(comments)}`) : `FAIL ${JSON.stringify(r.json)}`);
  console.log("   → average_rating FROM: AVG(rating) SQL, total_ratings FROM: COUNT(*), latest_comments FROM: SELECT comment ORDER BY created_at DESC LIMIT 10");

  // 5. GET /api/thoughts/2/verdict — no ratings, expect avg null, count 0, empty comments
  r = await call(getVerdict, { id: "2" });
  console.log(`5 GET /api/thoughts/2/verdict (no ratings):`, r.status===200 && r.json.average_rating===null && r.json.total_ratings===0 && r.json.latest_comments.length===0 ? `PASS avg=null count=0 empty comments` : `FAIL ${JSON.stringify(r.json)}`);

  // 6. GET /api/thoughts/3/verdict — one rating
  r = await call(getVerdict, { id: "3" });
  console.log(`6 GET /api/thoughts/3/verdict (one rating):`, r.status===200 && r.json.average_rating===5 && r.json.total_ratings===1 && r.json.latest_comments.length===1 ? `PASS avg=5 count=1` : `FAIL ${JSON.stringify(r.json)}`);

  // 7. GET /api/thoughts/random
  const reqRand = new Request("http://localhost/api/thoughts/random");
  const resRand = await getRandom(reqRand as any);
  const jsonRand = await resRand.json();
  console.log(`7 GET /api/thoughts/random:`, resRand.status===200 && jsonRand.thought && jsonRand.thought.id ? `PASS id=${jsonRand.thought.id} "${jsonRand.thought.content.slice(0,30)}..."` : `FAIL ${resRand.status} ${JSON.stringify(jsonRand)}`);

  // 8. random multiple calls should return valid thoughts (test 3 times)
  for(let i=0;i<3;i++){
    const rr = await getRandom(new Request("http://localhost/random") as any);
    const jj = await rr.json();
    console.log(`   random ${i+1}: id=${jj.thought?.id} ok=${rr.status===200}`);
  }

  // 9. verdict invalid id
  r = await call(getVerdict, { id: "9999" });
  console.log("9 GET /api/thoughts/9999/verdict:", r.status===404 ? `PASS 404` : `FAIL ${r.status}`);

  console.log("=== M4 tests done ===");
}
run().catch(e=>{console.error(e); process.exit(1)});
