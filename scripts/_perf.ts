import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const db = createClient(url, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function time(label: string, fn: () => Promise<unknown>, runs = 5) {
  await fn(); // ısınma
  const ms: number[] = [];
  for (let i = 0; i < runs; i++) {
    const t = performance.now();
    await fn();
    ms.push(performance.now() - t);
  }
  ms.sort((a, b) => a - b);
  console.log(`  ${label.padEnd(42)} medyan ${ms[Math.floor(runs / 2)].toFixed(0).padStart(5)} ms   (min ${ms[0].toFixed(0)}, max ${ms[runs-1].toFixed(0)})`);
  return ms[Math.floor(runs / 2)];
}

console.log(`\n  Proje: ${url}\n`);
console.log("  --- Ağ gidiş-dönüş süresi ---");
await time("boş HEAD isteği (saf ağ turu)", async () => {
  await fetch(`${url}/rest/v1/`, { headers: { apikey: anon } });
});
await time("auth getUser (oturumsuz)", async () => {
  await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon } });
});

console.log("\n  --- Tekil sorgular ---");
await time("listings select * (46 satır)", async () => {
  await db.from("listings").select("*");
});
await time("listings head count", async () => {
  await db.from("listings").select("id", { count: "exact", head: true });
});
await time("customers + interests(count)", async () => {
  await db.from("customers").select("*, interests:customer_listing_interests(count)");
});
await time("sales 12 ay", async () => {
  await db.from("sales").select("amount, closed_at");
});
await time("offers gömmeli liste", async () => {
  await db.from("offers").select("id, amount, status, created_at, updated_at, listing:listings(id,title,price,city,district), customer:customers(id,full_name), agent:agents(id,full_name,initials)");
});

console.log("\n  --- Sayfa başına sorgu sayısı (simülasyon) ---");
await time("dashboard: ardışık 12 sorgu", async () => {
  for (let i = 0; i < 12; i++) await db.from("listings").select("id").limit(1);
});
await time("dashboard: paralel 12 sorgu", async () => {
  await Promise.all(Array.from({ length: 12 }, () => db.from("listings").select("id").limit(1)));
});
console.log();
