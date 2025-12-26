import './App.css';
import Routerall from './components/routes/Route';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Routerall />
    </AuthProvider>
  );
}

export default App;
