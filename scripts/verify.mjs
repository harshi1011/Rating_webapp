import fs from "fs";
import { neon } from "@neondatabase/serverless";
const env = fs.readFileSync(".env.local","utf8");
for(const l of env.split("\n")){const m=l.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/); if(m) process.env[m[1]]=m[2].replace(/^["']|["']$/g,"");}
const sql=neon(process.env.DATABASE_URL);
const c1=await sql`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='thoughts' ORDER BY ordinal_position`;
console.log("thoughts columns:", c1);
const c2=await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='ratings' ORDER BY ordinal_position`;
console.log("ratings columns:", c2);
const fk=await sql`SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid='ratings'::regclass`;
console.log("ratings constraints:", fk);
const all=await sql`SELECT id, category FROM thoughts ORDER BY id`;
console.log("count", all.length, all.map(r=> `${r.id}:${r.category}`).join(", "));
