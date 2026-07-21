export function toPublicCandidate(row) {
  if (!row) return null;
  const { password_hash, password, ...publicFields } = row;
  return publicFields;
}

export function toPublicRecruiter(row) {
  if (!row) return null;
  const { password_hash, password, ...publicFields } = row;
  return publicFields;
}

export function toPublicCandidateList(rows) {
  return (rows || []).map(toPublicCandidate);
}

export function toPublicRecruiterList(rows) {
  return (rows || []).map(toPublicRecruiter);
}
