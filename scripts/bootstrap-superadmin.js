import bcrypt from 'bcrypt';
import { config as loadEnv } from 'dotenv';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { connection, db } from '../src/core/db/index.js';
import { recruiters } from '../src/core/db/recruiters/schema.js';

loadEnv();

const DEFAULT_EMAIL = process.env.SUPERADMIN_EMAIL || 'superadmin@example.com';
const DEFAULT_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin@123!';
const jwtSecret = process.env.JWT_SECRET || 'replace-me';

async function main() {
  const existing = await db
    .select()
    .from(recruiters)
    .where(eq(recruiters.email, DEFAULT_EMAIL))
    .limit(1);
  let user = existing[0];

  if (!user) {
    const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const [created] = await db
      .insert(recruiters)
      .values({
        email: DEFAULT_EMAIL,
        password_hash,
        full_name: 'Super Admin',
        role: 'superadmin',
      })
      .returning();
    user = created;
  }

  const token = jwt.sign(
    {
      sub: user.recruiter_id,
      role: user.role,
      email: user.email,
    },
    jwtSecret,
    { expiresIn: '1d' }
  );

  console.log('Superadmin seeded/verified:');
  console.log(`  email: ${user.email}`);
  console.log(`  password: ${DEFAULT_PASSWORD} (change after login)`);
  console.log('JWT (Bearer token):');
  console.log(token);

  await connection.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
