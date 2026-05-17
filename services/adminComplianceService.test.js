const fs = require('fs');
const path = require('path');

describe('admin compliance service', () => {
  test('keeps invitation code when delegating principal invitation link generation', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'services', 'adminComplianceService.js'), 'utf8');

    expect(source).toContain('export function principalInvitationLink(token, code)');
    expect(source).toContain('return buildPrincipalInvitationLink(token, code);');
  });
});
