import { getDb } from "../lib/firebase-admin";

async function main() {
  const db = getDb();
  for (const col of ["vendors", "items", "orders", "admins"]) {
    const snap = await db.collection(col).get();
    console.log(`${col}: ${snap.size} docs`);
    if (snap.size > 0 && snap.size <= 3) {
      snap.docs.forEach((d) =>
        console.log(`  - ${d.id} => ${JSON.stringify(d.data()).slice(0, 140)}`),
      );
    }
  }
  for (const doc of ["settings", "weekly_totals"]) {
    const d = await db.collection("config").doc(doc).get();
    console.log(`config/${doc}: ${d.exists ? JSON.stringify(d.data()) : "MISSING"}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
