import StudentInsightReportScreen from '../StudentInsightReport/StudentInsightReportScreen';

export default function FinalReportScreen({ navigateTo, studentId, language = 'ar' }) {
  return (
    <StudentInsightReportScreen
      navigateTo={navigateTo}
      studentId={studentId}
      language={language}
    />
  );
}
