import principalRegisterAr from '../i18n/principalRegister/ar.json';
import { mapPrincipalInvitationError } from './principalInvitationErrors';

describe('principalInvitationErrors', () => {
  it('maps expired invitations', () => {
    expect(mapPrincipalInvitationError('Invitation expired', 'expired', principalRegisterAr)).toBe(
      principalRegisterAr.expired
    );
  });

  it('maps invalid email / not invited', () => {
    expect(mapPrincipalInvitationError('not_invited', null, principalRegisterAr)).toBe(
      principalRegisterAr.invalidEmail
    );
  });

  it('maps used invitations', () => {
    expect(mapPrincipalInvitationError('Invitation is used', null, principalRegisterAr)).toBe(
      principalRegisterAr.used
    );
  });
});
