function normalizeValue(code, message) {
  return `${String(code || '')} ${String(message || '')}`.toLowerCase();
}

export function mapPrincipalInvitationError(message, code, labels = {}) {
  const value = normalizeValue(code, message);

  if (value.includes('expired')) return labels.expired;
  if (value.includes('not_invited') || value.includes('not invited')) return labels.invalidEmail;
  if (value.includes('invalid_email') || value.includes('email is required')) return labels.invalidEmail;
  if (value.includes('invalid_code') || value.includes('incorrect') || value.includes('does not belong')) {
    return labels.invalidCode;
  }
  if (value.includes('used') || value.includes('already been used')) return labels.used || labels.invalidTitle;
  if (value.includes('not_found') || value.includes('not found')) return labels.notFound;
  if (value.includes('invalid israeli id') || value.includes('invalid identity')) return labels.invalidIdentity;
  if (value.includes('activation failed') || value.includes('failed to create')) return labels.activationFailed;

  if (message && !/^[a-z0-9_\s:.()-]+$/i.test(String(message))) {
    return String(message);
  }

  if (message && value.split(' ').length > 2) {
    return labels.genericError || labels.invalidTitle;
  }

  return labels.genericError || labels.invalidTitle;
}

export default {
  mapPrincipalInvitationError,
};
