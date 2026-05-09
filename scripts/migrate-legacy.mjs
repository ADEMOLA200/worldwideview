import { DatabaseSync } from "node:sqlite";
import { PrismaClient } from "../src/generated/prisma/index.js";
import path from "node:path";
import fs from "node:fs";

async function migrate() {
    const sqlitePath = path.resolve(process.cwd(), "prisma/dev.db");
    
    if (!fs.existsSync(sqlitePath)) {
        console.error("❌ No legacy SQLite database found at prisma/dev.db");
        process.exit(1);
    }

    console.log("📂 Found legacy database. Initializing migration...");
    
    const prisma = new PrismaClient();
    const db = new DatabaseSync(sqlitePath);

    try {
        // 1. Migrate Users
        console.log("👤 Migrating users...");
        const users = db.prepare("SELECT * FROM users").all();
        for (const user of users) {
            await prisma.user.upsert({
                where: { id: user.id },
                update: {},
                create: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    hashedPassword: user.hashedPassword,
                    role: user.role,
                    createdAt: new Date(user.createdAt),
                }
            });
        }

        // 2. Migrate Favorites
        console.log("⭐️ Migrating favorites...");
        const favorites = db.prepare("SELECT * FROM favorites").all();
        for (const fav of favorites) {
            await prisma.favorite.upsert({
                where: { id: fav.id },
                update: {},
                create: {
                    id: fav.id,
                    userId: fav.userId,
                    entityId: fav.entityId,
                    pluginId: fav.pluginId,
                    label: fav.label,
                    pluginName: fav.pluginName,
                    lastSeen: new Date(fav.lastSeen),
                }
            });
        }

        // 3. Migrate Settings
        console.log("⚙️ Migrating settings...");
        const settings = db.prepare("SELECT * FROM settings").all();
        for (const setting of settings) {
            await prisma.setting.upsert({
                where: { id: setting.id },
                update: {},
                create: {
                    id: setting.id,
                    key: setting.key,
                    value: setting.value,
                }
            });
        }

        console.log("✅ Migration successful! All data moved to PostgreSQL.");
        console.log("💡 You can now safely delete prisma/dev.db");
        
    } catch (error) {
        console.error("❌ Migration failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

migrate();
