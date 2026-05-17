import {
  formatInstitutionCard,
  sortInstitutionPrograms,
} from './institutionMatchingService';

describe('institution matching service', () => {
  test('sorts same-region active programs before distant alternatives', () => {
    const programs = [
      {
        id: 'far',
        is_active: true,
        language_of_study: 'Hebrew',
        institution: { id: 'i2', region: 'north', type: 'university', latitude: 32.8, longitude: 35 },
      },
      {
        id: 'near',
        is_active: true,
        language_of_study: 'Arabic Hebrew',
        institution: { id: 'i1', region: 'south', type: 'academic_college', latitude: 31.25, longitude: 34.8 },
      },
    ];

    const sorted = sortInstitutionPrograms(programs, {
      region: 'south',
      latitude: 31.25,
      longitude: 34.8,
      languagePreference: 'ar',
    });

    expect(sorted[0].id).toBe('near');
    expect(sorted[0].same_region).toBe(true);
  });

  test('formats institution card with localized fields and why text', () => {
    const card = formatInstitutionCard({
      program_name_ar: 'هندسة برمجيات',
      degree_type: 'bachelor',
      same_region: true,
      institution: {
        name_ar: 'كلية الجنوب',
        city_ar: 'بئر السبع',
        region: 'south',
      },
    }, 'ar');

    expect(card.institution_name).toBe('كلية الجنوب');
    expect(card.program_name).toBe('هندسة برمجيات');
    expect(card.why_shown).toContain('نفس منطقتك');
  });
});
