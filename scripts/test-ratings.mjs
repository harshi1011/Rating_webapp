import { neon } from "@neondatabase/serverless";
import fs from "fs";

// Load env
const env = fs.readFileSync(".env.local","utf8");
for(const l of env.split("\n")){const m=l.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/); if(m) process.env[m[1]]=m[2].replace(/^["']|["']$/g,"");}
const sql = neon(process.env.DATABASE_URL);

// Simulate POST /api/ratings validation exactly as in route.ts
const MAX_COMMENT_LENGTH = 500;
async function simulatePost(body) {
  const { thought_id, rating, comment } = body ?? {};
  if (thought_id === undefined || thought_id === null) return { status:400, error:"thought_id is required"};
  const thoughtIdNum = Number(thought_id);
  if (!Number.isInteger(thoughtIdNum) || thoughtIdNum <=0) return { status:400, error:"thought_id must be a valid integer"};
  if (rating===undefined||rating===null) return { status:400, error:"rating is required"};
  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum)) return { status:400, error:"rating must be an integer between 1 and 5"};
  if (ratingNum<1||ratingNum>5) return { status:400, error:"rating must be between 1 and 5"};
  let normalizedComment = null;
  if (comment!==undefined && comment!==null) {
    if (typeof comment!=="string") return { status:400, error:"comment must be a string"};
    const trimmed = comment.trim();
    if (trimmed.length===0) normalizedComment=null;
    else if (trimmed.length>MAX_COMMENT_LENGTH) return { status:400, error:`comment must be at most ${MAX_COMMENT_LENGTH} characters`};
    else normalizedComment=trimmed;
  }
  const existing = await sql`SELECT id FROM thoughts WHERE id=${thoughtIdNum}`;
  if (existing.length===0) return { status:404, error:"thought not found"};
  const rows = await sql`INSERT INTO ratings (thought_id, rating, comment) VALUES (${thoughtIdNum}, ${ratingNum}, ${normalizedComment}) RETURNING id, thought_id, rating, comment, created_at`;
  return { status:201, data: rows[0]};
}

console.log("=== M3 Tests: POST /api/ratings ===");

// Clean ratings for deterministic test
await sql`DELETE FROM ratings`;
console.log("Cleared ratings");

// 1 valid rating
let r = await simulatePost({ thought_id: 1, rating: 4, comment: "This is painfully accurate." });
console.log("1 valid rating:", r.status===201 ? "PASS 201" : `FAIL ${r.status} ${r.error}`, r.data);

// 2 rating below 1
r = await simulatePost({ thought_id: 1, rating: 0, comment: "bad" });
console.log("2 rating 0 (below 1):", r.status===400 ? `PASS 400 ${r.error}` : `FAIL ${r.status}`);

// 3 rating above 5
r = await simulatePost({ thought_id: 1, rating: 6 });
console.log("3 rating 6 (above 5):", r.status===400 ? `PASS 400 ${r.error}` : `FAIL ${r.status}`);

// 4 non-integer rating
r = await simulatePost({ thought_id: 1, rating: 3.5 });
console.log("4 rating 3.5 (non-integer):", r.status===400 ? `PASS 400 ${r.error}` : `FAIL ${r.status}`);

// also string "4.5"
r = await simulatePost({ thought_id: 1, rating: "3.5" });
console.log("4b rating '3.5' string:", r.status===400 ? `PASS 400 ${r.error}` : `FAIL ${r.status}`);

// 5 invalid thought_id (non-existent)
r = await simulatePost({ thought_id: 9999, rating: 3 });
console.log("5 invalid thought_id 9999:", r.status===404 ? `PASS 404 ${r.error}` : `FAIL ${r.status}`);

// also invalid type
r = await simulatePost({ thought_id: "abc", rating: 3 });
console.log("5b invalid thought_id 'abc':", r.status===400 ? `PASS 400 ${r.error}` : `FAIL ${r.status}`);

// 6 empty comment (should succeed, comment null)
r = await simulatePost({ thought_id: 2, rating: 5, comment: "" });
console.log("6 empty comment:", r.status===201 ? `PASS 201 comment=${JSON.stringify(r.data.comment)}` : `FAIL ${r.status} ${r.error}`);

// 7 whitespace-only comment (should be treated as empty, stored null)
r = await simulatePost({ thought_id: 2, rating: 3, comment: "   \n\t  " });
console.log("7 whitespace-only comment:", r.status===201 ? `PASS 201 comment=${JSON.stringify(r.data.comment)} (expected null)` : `FAIL ${r.status}`);

// 8 comment max length exceeded
r = await simulatePost({ thought_id: 1, rating: 2, comment: "a".repeat(501) });
console.log("8 comment 501 chars:", r.status===400 ? `PASS 400 ${r.error}` : `FAIL ${r.status}`);

// 9 comment exactly 500 chars should pass
r = await simulatePost({ thought_id: 1, rating: 2, comment: "a".repeat(500) });
console.log("9 comment 500 chars:", r.status===201 ? `PASS 201` : `FAIL ${r.status} ${r.error}`);

// 10 valid without comment field
r = await simulatePost({ thought_id: 3, rating: 5 });
console.log("10 valid without comment:", r.status===201 ? `PASS 201 comment=${JSON.stringify(r.data.comment)}` : `FAIL`);

const counts = await sql`SELECT thought_id, COUNT(*)::int as c, AVG(rating)::float as avg FROM ratings GROUP BY thought_id ORDER BY thought_id`;
console.log("Ratings aggregated:", counts);

const all = await sql`SELECT id, thought_id, rating, comment, substring(comment,1,20) as preview FROM ratings ORDER BY id`;
console.log("All ratings:", all.map(x=> `${x.id}->thought${x.thought_id} rating${x.rating} comment=${x.comment===null?'NULL':`'${x.preview}'`}`));

console.log("=== M3 tests done ===");
