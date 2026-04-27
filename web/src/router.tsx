import { createBrowserRouter } from 'react-router-dom';
import { MainPage } from './pages/MainPage';
import { EventPage } from './pages/EventPage';
import { TermsAndConditionsPage } from './pages/TermsAndConditionsPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { DataDeletionPage } from './pages/DataDeletionPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { OrganizerSignupPage } from './pages/OrganizerSignupPage';
import { OrganizerSignupLandingPage } from './pages/OrganizerSignupLandingPage';
import { ProfilePage } from './pages/ProfilePage';
import { ManualEventPage } from './pages/ManualEventPage';
import { BecomeOrganizerOnboardingPage } from './pages/BecomeOrganizerOnboardingPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainPage />,
  },
  {
    path: '/events/:id',
    element: <EventPage />,
  },
  {
    path: '/terms',
    element: <TermsAndConditionsPage />,
  },
  {
    path: '/privacy',
    element: <PrivacyPolicyPage />,
  },
  {
    path: '/data-deletion',
    element: <DataDeletionPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },
  {
    path: '/signup-organizer',
    element: <OrganizerSignupPage />,
  },
  {
    path: '/signup-organizer-landing',
    element: <OrganizerSignupLandingPage />,
  },
  {
    path: '/profile',
    element: <ProfilePage />,
  },
  {
    path: '/organizer/events/new',
    element: <ManualEventPage />,
  },
  {
    path: '/organizer/onboarding',
    element: <BecomeOrganizerOnboardingPage />,
  },
]);
