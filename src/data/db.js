import Dexie from "dexie";
import { templateSeeds } from "./seeds";

export const db = new Dexie("anydb");

db.version(6).stores({
  diagrams: "++id, lastModified, loadedFromGistId",
  templates: "++id, custom",
});

db.on("populate", (transaction) => {
  transaction.templates.bulkAdd(templateSeeds).catch((e) => console.log(e));
});

async function migrate() {
  const oldDbName = "drawDB";
  const newDbName = "anydb";

  if ((await Dexie.exists(oldDbName)) && !(await Dexie.exists(newDbName))) {
    const oldDb = new Dexie(oldDbName);
    oldDb.version(6).stores({
      diagrams: "++id, lastModified, loadedFromGistId",
      templates: "++id, custom",
    });
    await oldDb.open();
    const diagrams = await oldDb.table("diagrams").toArray();
    const templates = await oldDb.table("templates").toArray();

    await db.transaction("rw", db.diagrams, db.templates, async () => {
      // Filter out templates that might duplicate the seeds if populate ran already? 
      // Populate runs only if DB is created. If we migrate, we might overwrite?
      // Actually, if we migrate, we should probably clear default templates or just add on top.
      // But preserving IDs is important.
      await db.diagrams.bulkAdd(diagrams);
      // For templates, we only migrate custom ones? The store says "++id, custom".
      // Assuming we want everything.
      // But 'populate' might have run if 'anydb' was just created by 'new Dexie("anydb")' line?
      // Dexie 'populate' event runs only when database is created (opened for first time and missing).
      // So if we run this migrate script, 'anydb' might be empty.
      // If we just copy everything, we should be fine.

      // Let's clear any seeded data just in case to avoid duplicates if IDs conflict
      await db.templates.clear();
      await db.templates.bulkAdd(templates);
    });
    console.log("Migrated data from drawDB to anydb");
  }
}

migrate().catch(console.error);
