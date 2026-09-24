import fs from "fs";
const env = fs.readFileSync(".env.local","utf8");
for(const l of env.split("\n")){const m=l.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/); if(m) process.env[m[1]]=m[2].replace(/^["']|["']$/g,"");}

// Use tsx to import TS route
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// We'll run via tsx loader: this file is mjs, so we need to use tsx to import route.ts
// Instead spawn a child process with tsx
import { spawn } from "child_process";
const child = spawn("npx", ["tsx", "scripts/test-route-tsx.ts"], { stdio: "inherit", shell: true });
child.on("close", code => process.exit(code));
