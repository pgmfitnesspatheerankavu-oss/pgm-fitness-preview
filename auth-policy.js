// Pure role decision used by Firebase Auth; profile lookup remains in firebase-client.js.
import { STAFF_CAPABILITIES, defaultStaffPermissions } from "./access-policy.js";
export function decideAccess(user, ownerUid, staffProfile = null) {
  if (!user) return { allowed: false, reason: "signed-out" };
  const ownerPhones = new Set(["+918606369000", "+918606369444", "+918157995527", "+917736359894"]);
  if (user.uid === ownerUid || ownerPhones.has(String(user.phoneNumber || ""))) return { allowed: true, role: "owner", uid: user.uid, permissions: [] };
  if (!staffProfile) return { allowed: false, reason: "not-provisioned" };
  if (staffProfile.role !== "staff" || staffProfile.active !== true) return { allowed: false, reason: "inactive-or-invalid-role" };
  const source = Array.isArray(staffProfile.permissions) ? staffProfile.permissions : defaultStaffPermissions();
  const permissions = [...new Set(source.filter(x => STAFF_CAPABILITIES.includes(x)))];
  return { allowed: true, role: "staff", uid: user.uid, displayName: staffProfile.displayName || "", permissions };
}
