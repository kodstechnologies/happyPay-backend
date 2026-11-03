import Role from "../model/role.model.js";

/**
 * Seed script to ensure required roles exist in the database
 * This should be run during application initialization or deployment
 */
export const seedRoles = async () => {
  try {
    console.log("Seeding roles...");

    const roles = [
      { name: "Retailer", slug: "retailer" },
      { name: "Distributor", slug: "distributor" },
      { name: "Admin", slug: "admin" },
    ];

    for (const role of roles) {
      const existingRole = await Role.findOne({ slug: role.slug });
      
      if (!existingRole) {
        await Role.create({
          name: role.name,
          slug: role.slug,
          isActive: true,
        });
        console.log(`Created role: ${role.name}`);
      } else {
        console.log(`Role already exists: ${role.name}`);
      }
    }

    console.log("Role seeding completed successfully");
  } catch (error) {
    console.error("Error seeding roles:", error);
    throw error;
  }
};

/**
 * Migration script to update existing distributors
 * This should be run once before deploying the new registration flow
 */
export const migrateExistingDistributors = async () => {
  try {
    console.log("Migrating existing distributors...");

    const distributorRole = await Role.findOne({ slug: "distributor" });
    if (!distributorRole) {
      console.log("Distributor role not found. Please run seedRoles first.");
      return;
    }

    // Find users who have retailers under them but don't have distributor role
    const allUsers = await User.find({
      $or: [
        { ditributor: { $exists: true } },
        { distributor: { $exists: true } }
      ]
    });

    const usersToUpgrade = [];

    for (const user of allUsers) {
      const parentObjectId = user._id;
      const parentIdStr = String(user._id);

      const registeredCount = await User.countDocuments({
        $or: [
          { ditributor: parentObjectId },
          { ditributor: parentIdStr },
          { distributor: parentObjectId },
          { distributor: parentIdStr },
        ],
      });

      if (registeredCount > 0) {
        const hasDistributorRole = user.roles?.some(
          (r) => r?.slug === "distributor" || r?.code === "distributor" || r?.name?.toLowerCase() === "distributor"
        ) || user.role === "distributor";

        if (!hasDistributorRole) {
          usersToUpgrade.push(user);
        }
      }
    }

    // Upgrade identified users to distributor role
    for (const user of usersToUpgrade) {
      await user.populate("roles");
      await user.assignRole("distributor", "Distributor");
      await user.save();
      console.log(`Migrated user ${user.mobile} to distributor role`);
    }

    console.log(`Migrated ${usersToUpgrade.length} users to distributor role`);
    console.log("Distributor migration completed successfully");
  } catch (error) {
    console.error("Error migrating distributors:", error);
    throw error;
  }
};

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedRoles()
    .then(() => {
      console.log("Seed script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seed script failed:", error);
      process.exit(1);
    });
}
