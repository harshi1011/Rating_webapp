import fs from 'fs';
import { neon } from '@neondatabase/serverless';
const env = fs.readFileSync('.env.local','utf8');
for(const l of env.split('\n')){const m=l.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/); if(m) process.env[m[1]]=m[2].replace(/^['\"]|['\"]$/g,'');}
const sql = neon(process.env.DATABASE_URL);
const rows = await sql`SELECT id, category FROM thoughts ORDER BY id`;
console.log(rows);
