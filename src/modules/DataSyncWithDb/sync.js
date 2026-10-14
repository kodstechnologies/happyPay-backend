import path from "path";
import url from "url";
import { billercategories, fetchByCat } from "../external/services/provider.service.js";
import Category from "../BBPS/models/category.model.js";
import Biller from "../BBPS/models/billers.model.js";

/**
 * Synchronize BBPS Categories and their associated Billers with the database.
 * Uses atomic bulkWrite upserts to prevent duplicate records and ensure maximum performance.
 *
 * @returns {Promise<Object>} Statistics on synced categories and billers.
 */
async function sync() {
  const stats = {
    categoriesFetched: 0,
    categoriesUpserted: 0,
    billersUpserted: 0,
    failedCategories: [],
  };

  try {
    console.log("[SYNC] Starting BBPS Category and Biller synchronization...");

    // 1. Fetch BBPS Categories from external service
    const categoryResponse = await billercategories();

    // Safely extract categories array across possible wrapper formats
    const rawCategories =
      categoryResponse?.data?.categories ||
      categoryResponse?.data?.data?.categories ||
      categoryResponse?.categories ||
      [];

    if (!Array.isArray(rawCategories) || rawCategories.length === 0) {
      console.warn("[SYNC] No categories received from provider API.");
      return stats;
    }

    stats.categoriesFetched = rawCategories.length;
    console.log(`[SYNC] Fetched ${rawCategories.length} categories.`);

    // Deduplicate categories in-memory by id to prevent duplicate keys in bulkWrite
    const uniqueCategories = [];
    const seenCategoryIds = new Set();
    for (const cat of rawCategories) {
      if (!cat?.id) continue;
      const catId = String(cat.id).trim();
      if (!seenCategoryIds.has(catId)) {
        seenCategoryIds.add(catId);
        uniqueCategories.push(cat);
      }
    }

    // 2. Upsert Categories into MongoDB
    const categoryOps = uniqueCategories.map((cat) => ({
      updateOne: {
        filter: { id: String(cat.id).trim() },
        update: {
          $set: {
            id: String(cat.id).trim(),
            service_name: String(cat.service_name || "").trim(),
            icon: cat.icon ? String(cat.icon).trim() : null,
          },
        },
        upsert: true,
      },
    }));

    if (categoryOps.length > 0) {
      const catResult = await Category.bulkWrite(categoryOps, { ordered: false });
      stats.categoriesUpserted =
        (catResult.upsertedCount || 0) + (catResult.modifiedCount || 0);
      console.log(`[SYNC] Categories upserted: ${stats.categoriesUpserted}`);
    }

    // 3. For each category, fetch and sync its billers
    for (const cat of uniqueCategories) {
      const catName = String(cat.service_name || "").trim();
      if (!catName) continue;

      try {
        console.log(`[SYNC] Fetching billers for category: "${catName}"...`);
        const billerResponse = await fetchByCat({ catname: catName });

        // Safely extract biller list across possible response structures
        const rawBillers =
          Array.isArray(billerResponse?.data?.data)
            ? billerResponse.data.data
            : Array.isArray(billerResponse?.data)
            ? billerResponse.data
            : Array.isArray(billerResponse)
            ? billerResponse
            : [];

        if (!rawBillers.length) {
          console.log(`[SYNC] No billers found for category: "${catName}".`);
          continue;
        }

        // Deduplicate billers for this category to prevent duplicate operations in bulkWrite
        const billerOps = [];
        const seenBillerKeys = new Set();

        for (const b of rawBillers) {
          const opcodeStr =
            b.opcode !== undefined && b.opcode !== null ? String(b.opcode).trim() : "";
          const idStr =
            b.id !== undefined && b.id !== null ? String(b.id).trim() : "";
          const serviceTypeStr = String(b.service_type || catName).trim();

          const dedupeKey = opcodeStr
            ? `op_${opcodeStr}`
            : `id_${idStr}_${serviceTypeStr}`;

          if (seenBillerKeys.has(dedupeKey)) continue;
          seenBillerKeys.add(dedupeKey);

          // Unique identifier filter to prevent duplicate database entries
          const filter = opcodeStr
            ? { opcode: opcodeStr }
            : { id: idStr, service_type: serviceTypeStr };

          billerOps.push({
            updateOne: {
              filter,
              update: {
                $set: {
                  id: idStr,
                  service_name: String(b.service_name || "").trim(),
                  opcode: opcodeStr,
                  service_type: serviceTypeStr,
                  CUSTNO: String(b.CUSTNO || "").trim(),
                  AMT: String(b.AMT || "").trim(),
                  REFMOBILENO: String(b.REFMOBILENO || "").trim(),
                },
              },
              upsert: true,
            },
          });
        }

        if (billerOps.length > 0) {
          const billerResult = await Biller.bulkWrite(billerOps, { ordered: false });
          const upsertedCount =
            (billerResult.upsertedCount || 0) + (billerResult.modifiedCount || 0);
          stats.billersUpserted += upsertedCount;
          console.log(
            `[SYNC] Successfully upserted ${upsertedCount} billers for "${catName}".`
          );
        }
      } catch (catError) {
        console.error(
          `[SYNC ERROR] Failed to sync billers for category "${catName}":`,
          catError?.message || catError
        );
        stats.failedCategories.push({
          category: catName,
          error: catError?.message || String(catError),
        });
      }
    }

    console.log("[SYNC] Synchronization completed successfully.", stats);
    return stats;
  } catch (error) {
    console.error(
      "[SYNC FATAL ERROR] Category & Biller sync failed:",
      error?.message || error
    );
    throw error;
  }
}

// Allow direct execution via CLI (e.g. `node src/modules/DataSyncWithDb/sync.js`)
const isDirectRun =
  process.argv[1] &&
  path.resolve(url.fileURLToPath(import.meta.url)).toLowerCase() ===
    path.resolve(process.argv[1]).toLowerCase();

if (isDirectRun) {
  (async () => {
    try {
      const { default: connectDB } = await import("../../config/db.js");
      await connectDB();
      await sync();
      process.exit(0);
    } catch (err) {
      console.error("Direct sync execution failed:", err);
      process.exit(1);
    }
  })();
}

export { sync };
export default sync;