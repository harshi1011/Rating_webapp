import fs from "fs";
const env = fs.readFileSync(".env.local","utf8");
for(const l of env.split("\n")){const m=l.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/); if(m) process.env[m[1]]=m[2].replace(/^["']|["']$/g,"");}
const { getSql } = await import("../lib/db");
const sql = getSql();
const r8 = await sql`SELECT * FROM thoughts WHERE id=8`;
console.log("local id 8", r8);
const all = await sql`SELECT id, category FROM thoughts ORDER BY id`;
console.log(all);
