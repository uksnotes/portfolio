import { db, sha } from './server';
/** Only platform-injected authenticated identity headers are accepted.
 * The Sites dispatcher can provide email without a user-id. Persist aliases
 * to one canonical owner so subsequent header combinations keep the same data.
 */
export async function platformIdentity(r: Request): Promise<string> {
  const id = r.headers.get('oai-authenticated-user-id')?.trim();
  const email = r.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
  const validEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
  if (!id && !validEmail) throw new Error('AUTH');
  const aliases: string[] = [];
  if (id) aliases.push('id:' + await sha(id));
  if (validEmail) aliases.push('email:' + await sha(validEmail));
  const query = `SELECT owner FROM identity_aliases WHERE alias IN (${aliases.map(() => '?').join(',')})`;
  const found = await db().prepare(query).bind(...aliases).all<{owner:string}>();
  const owners = [...new Set(found.results.map(x => x.owner))];
  if (owners.length > 1) throw new Error('인증 정보 연결을 확인해야 합니다.');
  // Existing id-based records remain accessible, while email-only identities
  // receive a stable opaque key independent of browser cookies or sessions.
  const owner = owners[0] || id || ('platform-email:' + await sha(validEmail!));
  await db().batch(aliases.map(alias => db().prepare(
    'INSERT INTO identity_aliases(alias,owner) VALUES(?,?) ON CONFLICT(alias) DO NOTHING'
  ).bind(alias, owner)));
  const confirmed = await db().prepare(query).bind(...aliases).all<{owner:string}>();
  const canonical = [...new Set(confirmed.results.map(x => x.owner))];
  if (canonical.length !== 1) throw new Error('인증 정보 연결을 확인해야 합니다.');
  return canonical[0];
}
