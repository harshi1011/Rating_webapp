import { neon } from "@neondatabase/serverless";
import fs from "fs";
const env = fs.readFileSync(".env.local","utf8");
for(const l of env.split("\n")){const m=l.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/); if(m) process.env[m[1]]=m[2].replace(/^["']|["']$/g,"");}
const sql = neon(process.env.DATABASE_URL);
console.log("Truncating thoughts and ratings to keep ONLY 3 required thoughts...");
// Use TRUNCATE to reset identities and cascade ratings
await sql`TRUNCATE TABLE ratings, thoughts RESTART IDENTITY CASCADE`;
console.log("Truncated.");

const three = [
  { content: "If a mosquito drinks your blood, flies away, and then lays eggs… did you technically contribute to a mosquito family?", category: "Brain Logic" },
  { content: "I said “never again,” then I agained.", category: "Everyday Life" },
  { content: "Australia has three A's, all pronounced differently", category: "Random" },
];
for(const t of three){
  await sql`INSERT INTO thoughts (content, category) VALUES (${t.content}, ${t.category})`;
}
const rows = await sql`SELECT id, category, content FROM thoughts ORDER BY id`;
console.log(`Inserted ${rows.length} thoughts:`);
rows.forEach(r=> console.log(`- ${r.id} [${r.category}] "${r.content}"`));
const count = await sql`SELECT COUNT(*)::int as c FROM thoughts`;
console.log("Final count:", count[0].c);
if(count[0].c !== 3) throw new Error("Expected 3 thoughts");
console.log("Verify verbatim matches:");
for(const r of three){
  const found = await sql`SELECT id FROM thoughts WHERE content = ${r.content}`;
  console.log(found.length ? `✓ "${r.content.slice(0,40)}..."` : `✗ MISSING "${r.content}"`);
}
console.log("Done.");
