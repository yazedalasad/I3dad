import { I18nextProvider } from 'react-i18next';
import { AuthProvider } from './contexts/AuthContext';
import i18n from './i18n/config'; // Initialize i18n
import ManualNavigator from './navigation/ManualNavigator';

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <ManualNavigator />
      </AuthProvider>
    </I18nextProvider>
  );
}
