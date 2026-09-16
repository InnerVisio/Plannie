import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, CalendarDays, AlertCircle } from 'lucide-react';
import { Card, CardBody, Button, Input } from '../components/ui';
import { ThemeToggleButton } from '../components/layout/ThemeToggle';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/prehled');
    } catch {
      setError('Neplatný e-mail nebo heslo. Zkuste to prosím znovu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-app flex items-center justify-center p-6 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggleButton />
      </div>
      <Card className="w-full max-w-md">
        <CardBody className="p-8 sm:p-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center mb-5">
              <CalendarDays className="w-7 h-7 text-accent-fg" />
            </div>
            <h1 className="text-2xl font-bold text-primary tracking-tight">Přihlášení</h1>
            <p className="text-muted mt-1.5 text-[11px] uppercase tracking-wider font-bold">
              Zabezpečený přístup agentury
            </p>
          </div>

          {error && (
            <div
              className="mb-6 p-3.5 rounded-[var(--radius-field)] text-sm font-medium flex items-center gap-2.5"
              style={{ background: 'var(--status-revision-bg)', color: 'var(--status-revision-fg)' }}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="email"
              required
              label="E-mailová adresa"
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@agentura.cz"
              autoComplete="email"
            />
            <Input
              type="password"
              required
              label="Heslo"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              disabled={!email || !password}
              className="mt-2"
            >
              Přihlásit se
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
