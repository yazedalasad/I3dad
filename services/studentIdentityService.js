import { requireSupabase } from '../config/supabase';
import { normalizeIsraeliId } from '../src/utils/israeliId';

export async function isStudentIdTaken(studentId) {
  const normalizedId = normalizeIsraeliId(studentId);
  if (!normalizedId) return false;

  try {
    const client = requireSupabase();
    const { data, error } = await client.rpc('is_student_id_taken', {
      p_student_id: normalizedId,
    });

    if (error) {
      console.warn('student id availability check failed:', error.message);
      return null;
    }

    return Boolean(data);
  } catch (error) {
    console.warn('student id availability check failed:', error?.message || error);
    return null;
  }
}

export default {
  isStudentIdTaken,
};
