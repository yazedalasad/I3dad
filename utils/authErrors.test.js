import {
  buildStudentIdExistsError,
  isDuplicateStudentIdError,
  resolveAuthErrorMessage,
  resolveLoginFieldErrors,
} from './authErrors';

const t = (key) => key;

describe('authErrors', () => {
  it('maps invalid login credentials', () => {
    expect(
      resolveAuthErrorMessage({ message: 'Invalid login credentials' }, { t, context: 'login' })
    ).toBe('auth.login.errors.invalidCredentials');
  });

  it('maps network failures for login', () => {
    expect(
      resolveAuthErrorMessage({ message: 'Failed to fetch' }, { t, context: 'login' })
    ).toBe('auth.login.errors.network');
  });

  it('maps duplicate student id for signup', () => {
    expect(
      resolveAuthErrorMessage(buildStudentIdExistsError(), { t, context: 'signup' })
    ).toBe('auth.signup.errors.studentIdExists');
  });

  it('maps invalid credentials to separate field hints', () => {
    const result = resolveLoginFieldErrors(
      { message: 'Invalid login credentials' },
      { t }
    );
    expect(result.email).toBe('auth.login.errors.invalidEmailField');
    expect(result.password).toBe('auth.login.errors.invalidPasswordField');
    expect(result.alert).toBe('auth.login.errors.invalidCredentials');
  });

  it('detects postgres unique violation as duplicate student id', () => {
    expect(
      isDuplicateStudentIdError({
        code: '23505',
        message: 'duplicate key value violates unique constraint "students_student_id_key"',
      })
    ).toBe(true);
  });
});
