import { neon } from "@neondatabase/serverless";
import fs from "fs";

// Load .env.local manually (raw SQL project, no dotenv dep)
const envText = fs.readFileSync(".env.local", "utf8");
for (const line of envText.split("\n")) {
  const m = line.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const sql = neon(process.env.DATABASE_URL);

console.log("Creating schema...");

await sql`DROP TABLE IF EXISTS ratings`;
await sql`DROP TABLE IF EXISTS thoughts`;

await sql`
  CREATE TABLE thoughts (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

await sql`
  CREATE TABLE ratings (
    id SERIAL PRIMARY KEY,
    thought_id INTEGER NOT NULL REFERENCES thoughts(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

await sql`CREATE INDEX idx_ratings_thought_id ON ratings(thought_id)`;
await sql`CREATE INDEX idx_ratings_created_at ON ratings(created_at DESC)`;

console.log("Tables created.");

const thoughts = [
  // 3 REQUIRED verbatim — do not modify
  { content: "If a mosquito drinks your blood, flies away, and then lays eggs… did you technically contribute to a mosquito family?", category: "Brain Logic" },
  { content: "I said “never again,” then I agained.", category: "Everyday Life" },
  { content: "Australia has three A's, all pronounced differently", category: "Random" },

  // Remaining 22 original thoughts
  { content: "Why do we open the fridge again even though we know nothing new will magically appear?", category: "Everyday Life" },
  { content: "My brain remembers every embarrassing thing I did since 2015, but only at 3 AM.", category: "Brain Logic" },
  { content: "If I set 5 alarms, am I planning to wake up or planning to disappoint myself 5 times?", category: "College" },
  { content: "Indian parents can sense when you're about to order food online and will instantly say 'ghar ka khana hai'.", category: "Indian Parents" },
  { content: "We say 'just 5 more minutes' of sleep and wake up 45 minutes later with full regret.", category: "Everyday Life" },
  { content: "Why does the food I order always look sadder in reality than in the photo?", category: "Food" },
  { content: "If work is work from home, why does home feel like work now?", category: "Work" },
  { content: "We check our phones before sleeping, then complain we can't sleep.", category: "Everyday Life" },
  { content: "College taught me that 'due tomorrow' means 'do tomorrow'.", category: "College" },
  { content: "Relationships are just two people asking 'what to eat?' until one gets annoyed.", category: "Relationships" },
  { content: "The ceiling fan makes more decisions than I do — it decides when to make weird noises at night.", category: "Random" },
  { content: "If I crave Maggi at 3 AM, is it hunger or nostalgia?", category: "Food" },
  { content: "My brain replays a conversation from 3 years ago and gives me a better reply at 3 AM.", category: "Brain Logic" },
  { content: "We save money all month to spend it all in one midnight Zomato order.", category: "Food" },
  { content: "Why does 'seen' hurt more than a straight 'no'?", category: "Relationships" },
  { content: "Indian parents' answer to everything: 'Sharma ji ke bete ko dekho'.", category: "Indian Parents" },
  { content: "If I sleep early I wake up late, if I sleep late I wake up early — who is winning?", category: "Everyday Life" },
  { content: "Work emails at 11 PM should be illegal, but my boss thinks time zones are suggestions.", category: "Work" },
  { content: "We buy plants to prove we can keep something alive, then forget to water them.", category: "Everyday Life" },
  { content: "My brain at 3 AM: 'What if gravity just stops tomorrow?'", category: "Random" },
  { content: "Why does the WiFi get slower the moment I have an important call?", category: "Work" },
  { content: "Indian moms can find things you couldn't find even after searching for an hour.", category: "Indian Parents" },
];

console.log(`Seeding ${thoughts.length} thoughts...`);
for (const t of thoughts) {
  await sql`INSERT INTO thoughts (content, category) VALUES (${t.content}, ${t.category})`;
}

const count = await sql`SELECT COUNT(*)::int as c FROM thoughts`;
console.log(`Seeded thoughts: ${count[0].c}`);

const sample = await sql`SELECT id, category, substring(content,1,60) as preview FROM thoughts ORDER BY id LIMIT 5`;
console.log(sample);

// Verify 3 required exist exactly
const required = [
  "If a mosquito drinks your blood, flies away, and then lays eggs… did you technically contribute to a mosquito family?",
  "I said “never again,” then I agained.",
  "Australia has three A's, all pronounced differently"
];
for (const r of required) {
  const found = await sql`SELECT id FROM thoughts WHERE content = ${r}`;
  console.log(found.length ? `✓ Found required: ${r.slice(0,40)}...` : `✗ MISSING: ${r}`);
}

console.log("Done.");
