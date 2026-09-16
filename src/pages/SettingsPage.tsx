import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardBody, Button, Avatar } from '../components/ui';
import { ThemeToggleTabs } from '../components/layout/ThemeToggle';
import { NOTIFICATION_EMAIL } from '../lib/config';
import { Palette, Bell, UserCircle, LogOut } from 'lucide-react';

export default function SettingsPage() {
  const { currentUser } = useAuth();

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader title="Vzhled" icon={Palette} />
        <CardBody>
          <p className="text-sm text-secondary mb-4">Zvolte, jak má aplikace vypadat.</p>
          <ThemeToggleTabs />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Notifikace" icon={Bell} />
        <CardBody>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
            E-mail pro upozornění
          </p>
          <p className="text-sm text-primary font-medium">{NOTIFICATION_EMAIL}</p>
          <p className="text-xs text-secondary mt-2">
            Adresa je nastavena přes proměnnou prostředí a nelze ji zde upravit.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Účet" icon={UserCircle} />
        <CardBody className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={currentUser?.email ?? 'A'} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary truncate">{currentUser?.email}</p>
              <p className="text-xs text-secondary">Přihlášen jako agentura</p>
            </div>
          </div>
          <Button variant="danger" icon={LogOut} onClick={() => signOut(auth)}>
            Odhlásit se
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
