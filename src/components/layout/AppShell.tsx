import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar, { MobileTopBar } from './TopBar';
import MobileTabBar from './MobileTabBar';
import { AgencyDataProvider } from '../../hooks/useAgencyData';
import { ActivityProvider } from '../../hooks/useActivity';
import { CommentsProvider } from '../../hooks/useComments';

export default function AppShell() {
  return (
    <AgencyDataProvider>
      <ActivityProvider>
        <CommentsProvider>
          <div className="h-dvh flex overflow-hidden bg-app">
            <Sidebar />
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
              <TopBar />
              <MobileTopBar />
              <main className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-24 lg:pb-0">
                <div className="max-w-[1400px] mx-auto px-4 py-5 sm:px-6 sm:py-6">
                  <Outlet />
                </div>
              </main>
            </div>
            <MobileTabBar />
          </div>
        </CommentsProvider>
      </ActivityProvider>
    </AgencyDataProvider>
  );
}
