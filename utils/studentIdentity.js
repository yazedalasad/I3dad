function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getEmailLocalName(email) {
  const localPart = String(email || '').split('@')[0];
  return normalizeWhitespace(localPart);
}

export function getStudentDisplayName({ user, studentData, profile, fallback = '' } = {}) {
  const studentFullName = normalizeWhitespace(
    `${studentData?.first_name || ''} ${studentData?.last_name || ''}`
  );
  if (studentFullName) return studentFullName;

  const profileName = normalizeWhitespace(
    profile?.full_name ||
      profile?.display_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      ''
  );
  if (profileName) return profileName;

  const emailName = getEmailLocalName(user?.email);
  if (emailName) return emailName;

  return normalizeWhitespace(fallback);
}

export function getStudentFirstDisplayName({ user, studentData, profile, fallback = '' } = {}) {
  const studentFirstName = normalizeWhitespace(studentData?.first_name || '');
  if (studentFirstName) return studentFirstName;

  const displayName = getStudentDisplayName({ user, studentData, profile, fallback });
  if (!displayName) return '';

  return normalizeWhitespace(displayName.split(' ')[0]);
}

export function buildStudentIdentity({ user, studentData, profile, fallback = '' } = {}) {
  const fullName = getStudentDisplayName({ user, studentData, profile, fallback });
  const firstName = getStudentFirstDisplayName({ user, studentData, profile, fallback });
  const emailName = getEmailLocalName(user?.email);

  return {
    fullName,
    firstName,
    emailName,
    hasResolvedName: !!(fullName || firstName),
  };
}
