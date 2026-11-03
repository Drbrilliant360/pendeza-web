#!/usr/bin/env node
// Creates (or updates) three default accounts with the Firebase Admin SDK:
//   client  – role 'client', profile complete (skips onboarding)
//   owner   – role 'owner' + a demo salon (so it lands on the owner dashboard)
//   admin   – role 'admin' (the app's highest role: full access to /admin/*)
//
// Usage:
//   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
//     node scripts/seed-accounts.mjs --project <projectId> [--yes] [--approve-salon] [--reset-passwords]
//
// Passwords are random unless given via SEED_CLIENT_PASSWORD / SEED_OWNER_PASSWORD / SEED_ADMIN_PASSWORD.
// They are written ONLY to scripts/.seed-accounts.local.json (git-ignored); nothing secret is printed.
// Emails can be overridden with SEED_CLIENT_EMAIL / SEED_OWNER_EMAIL / SEED_ADMIN_EMAIL.
// Safe to re-run: existing users are updated, passwords are kept unless --reset-passwords.
import { randomBytes } from 'node:crypto'
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore'

// Load emails/passwords from scripts/.seed-accounts.local.env if present (real env vars win).
{
  const envFile = join(dirname(fileURLToPath(import.meta.url)), '.seed-accounts.local.env')
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*'?(.*?)'?\s*$/)
      if (m && !line.trimStart().startsWith('#') && process.env[m[1]] == null) process.env[m[1]] = m[2]
    }
  }
}

const PRODUCTION_PROJECT = 'bpsa-8bde0'
const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const opt = (name) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}

const projectId = opt('project')
if (!projectId) {
  console.error('Missing --project <projectId>. (Production is "bpsa-8bde0"; prefer a staging project.)')
  process.exit(1)
}
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON for the project (Firebase console → Project settings → Service accounts).')
  process.exit(1)
}
if (projectId === PRODUCTION_PROJECT && !flag('yes')) {
  console.error(
    `"${projectId}" is the LIVE project shared with the mobile app's real users.\n` +
      'Re-run with --yes if you really want demo accounts (including a full-access admin) there.',
  )
  process.exit(1)
}

initializeApp({ credential: applicationDefault(), projectId })
const auth = getAuth()
const db = getFirestore()

const strongPassword = () => `Pz-${randomBytes(12).toString('base64url')}!7`

const ACCOUNTS = [
  {
    key: 'client',
    email: process.env.SEED_CLIENT_EMAIL ?? 'demo.client@pendeza.test',
    password: process.env.SEED_CLIENT_PASSWORD,
    fullName: 'Demo Client',
    phoneNumber: '+255712000001',
    gender: 'female',
    role: 'client',
  },
  {
    key: 'owner',
    email: process.env.SEED_OWNER_EMAIL ?? 'demo.owner@pendeza.test',
    password: process.env.SEED_OWNER_PASSWORD,
    fullName: 'Demo Salon Owner',
    phoneNumber: '+255712000002',
    gender: 'male',
    role: 'owner',
  },
  {
    key: 'admin',
    email: process.env.SEED_ADMIN_EMAIL ?? 'demo.admin@pendeza.test',
    password: process.env.SEED_ADMIN_PASSWORD,
    fullName: 'Pendeza Admin',
    phoneNumber: '+255712000003',
    gender: 'prefer_not_to_say',
    role: 'admin',
  },
]

async function upsertAuthUser(a) {
  try {
    const existing = await auth.getUserByEmail(a.email)
    if (flag('reset-passwords') || a.password) {
      const password = a.password ?? strongPassword()
      await auth.updateUser(existing.uid, { password, displayName: a.fullName, emailVerified: true, disabled: false })
      return { uid: existing.uid, password, created: false }
    }
    return { uid: existing.uid, password: null, created: false }
  } catch (e) {
    if (e?.code !== 'auth/user-not-found') throw e
    const password = a.password ?? strongPassword()
    const user = await auth.createUser({ email: a.email, password, displayName: a.fullName, emailVerified: true })
    return { uid: user.uid, password, created: true }
  }
}

/** Same shape as UserModel.toFirestore() in the app. */
async function upsertUserDoc(uid, a) {
  const ref = db.collection('users').doc(uid)
  const snap = await ref.get()
  await ref.set(
    {
      email: a.email,
      fullName: a.fullName,
      username: null,
      phoneNumber: a.phoneNumber,
      profilePictureUrl: null,
      role: a.role,
      gender: a.gender,
      fcmTokens: snap.exists ? snap.get('fcmTokens') ?? [] : [],
      createdAt: snap.exists ? snap.get('createdAt') ?? Timestamp.now() : Timestamp.now(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )
}

/** Demo salon for the owner (same shape as FirestoreService.createSalon). Pending = hidden from clients. */
async function ensureSalon(ownerId) {
  const existing = await db.collection('salons').where('ownerId', '==', ownerId).limit(1).get()
  const status = flag('approve-salon') ? 'approved' : 'pending'
  if (!existing.empty) {
    if (flag('approve-salon')) await existing.docs[0].ref.update({ verificationStatus: 'approved', reviewedAt: Timestamp.now() })
    return { id: existing.docs[0].id, status: flag('approve-salon') ? 'approved' : existing.docs[0].get('verificationStatus') }
  }
  const ref = db.collection('salons').doc()
  const now = Timestamp.now()
  await ref.set({
    ownerId,
    salonName: 'Pendeza Demo Salon',
    address: 'Demo address, Kinondoni',
    serviceCategories: ['hair', 'nails'],
    createdAt: now,
    businessTypeIds: [],
    businessTypeNames: [],
    region: 'Dar es Salaam',
    district: 'Kinondoni',
    verificationStatus: status,
    submittedAt: now,
    ...(status === 'approved' ? { reviewedAt: now } : {}),
    imageGallery: [],
    openingTime: '08:00',
    closingTime: '20:00',
    amenities: [],
    description: 'Demo salon created by scripts/seed-accounts.mjs for testing.',
  })
  return { id: ref.id, status }
}

const out = { project: projectId, generatedAt: new Date().toISOString(), accounts: {} }
for (const a of ACCOUNTS) {
  const { uid, password, created } = await upsertAuthUser(a)
  await upsertUserDoc(uid, a)
  const entry = { email: a.email, uid, role: a.role, ...(password ? { password } : { password: '(unchanged – use --reset-passwords)' }) }
  if (a.role === 'owner') entry.salon = await ensureSalon(uid)
  out.accounts[a.key] = entry
  console.log(`${created ? 'created' : 'updated'}  ${a.role.padEnd(6)} ${a.email}  uid=${uid}${entry.salon ? `  salon=${entry.salon.id} (${entry.salon.status})` : ''}`)
}

const file = join(dirname(fileURLToPath(import.meta.url)), '.seed-accounts.local.json')
writeFileSync(file, JSON.stringify(out, null, 2) + '\n')
chmodSync(file, 0o600)
console.log(`\nCredentials written to ${file} (git-ignored, owner-read-only). Passwords are not printed.`)
process.exit(0)
