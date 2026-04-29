import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeaderLogoLink } from '../components/HeaderLogoLink';
import { ThemeToggle } from '../components/ThemeToggle';
import { Footer } from '../components/Footer';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import {
  verifyOrganizerKey,
  registerOrganizerWithKey,
  mapOrganizerKeyError,
  mapAuthError,
} from '../services/auth';
import {
  isValidOrganizerKey,
  isValidUsername,
  isValidPassword,
  passwordsMatch,
} from '../utils/validationUtils';
import {
  sanitizeErrorMessage,
  isRateLimited,
  getSecondsUntilRateLimitExpires,
  isTokenExpiringSoon,
} from '../utils/securityUtils';
import '../styles/SignupPage.css';

const MAX_VERIFICATION_ATTEMPTS = 5;
const RATE_LIMIT_DURATION_MS = 60000; // 1 minute

export function OrganizerSignupPage() {
  const navigate = useNavigate();

  // Step 1: Key Verification
  const [keyInput, setKeyInput] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyAttempts, setVerifyAttempts] = useState<number>(0);
  const [lastVerifyAttemptTime, setLastVerifyAttemptTime] = useState<number | null>(null);

  // Step 2: Registration (populated after Step 1 succeeds)
  const [confirmationToken, setConfirmationToken] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [tokenExpiresAt, setTokenExpiresAt] = useState<number | null>(null); // Unix timestamp in seconds

  // Registration fields
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isRegistering, setIsRegistering] = useState<boolean>(false);

  // Error/Status
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [showSuccessMessage, setShowSuccessMessage] = useState<boolean>(false);

  // Cleanup sensitive data on unmount
  useEffect(() => {
    return () => {
      // Clear sensitive data when component unmounts
      setPassword('');
      setConfirmPassword('');
      setConfirmationToken('');
      setKeyInput('');
    };
  }, []);

  // Check if rate limited
  const isRateLimitedNow = isRateLimited(
    verifyAttempts,
    lastVerifyAttemptTime,
    MAX_VERIFICATION_ATTEMPTS,
    RATE_LIMIT_DURATION_MS
  );

  const secondsUntilRateLimitExpires = getSecondsUntilRateLimitExpires(
    lastVerifyAttemptTime,
    RATE_LIMIT_DURATION_MS
  );

  const isTokenExpiring = isTokenExpiringSoon(tokenExpiresAt, 120); // 2 minutes warning

  async function handleVerifyKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');

    // Check rate limit
    if (isRateLimitedNow) {
      setErrorMessage(
        `Too many verification attempts. Please wait ${secondsUntilRateLimitExpires} seconds before trying again.`
      );
      return;
    }

    const trimmedKey = keyInput.trim();

    // Client-side validation
    if (!trimmedKey) {
      setErrorMessage('Key is required.');
      return;
    }

    if (!isValidOrganizerKey(trimmedKey)) {
      setErrorMessage('Key must be exactly 32 alphanumeric characters.');
      return;
    }

    setIsVerifying(true);
    try {
      const result = await verifyOrganizerKey(trimmedKey);
      setConfirmationToken(result.confirmationToken);
      setEmail(result.email);
      setTokenExpiresAt(Math.floor(Date.now() / 1000) + result.expiresIn);
      setCurrentStep(2);
      setVerifyAttempts(0); // Reset attempts on success
    } catch (error) {
      const errorMsg = mapOrganizerKeyError(error) || mapAuthError(error);
      setErrorMessage(sanitizeErrorMessage(errorMsg));
      setVerifyAttempts((prev) => prev + 1);
      setLastVerifyAttemptTime(Date.now());

      // Show warning after 3 attempts
      if (verifyAttempts >= 2) {
        const remaining = MAX_VERIFICATION_ATTEMPTS - (verifyAttempts + 1);
        if (remaining > 0) {
          setErrorMessage(`${sanitizeErrorMessage(errorMsg)}\n⚠️ ${remaining} attempts remaining.`);
        }
      }
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');

    const trimmedUsername = username.trim();

    // Client-side validation
    if (!trimmedUsername || !password || !confirmPassword) {
      setErrorMessage('Please fill in all fields.');
      return;
    }

    if (!isValidUsername(trimmedUsername)) {
      setErrorMessage(
        'Username must be 3-50 characters and contain only letters, numbers, underscores, and hyphens.'
      );
      return;
    }

    if (!isValidPassword(password)) {
      setErrorMessage('Password must be at least 12 characters.');
      return;
    }

    if (!passwordsMatch(password, confirmPassword)) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsRegistering(true);
    try {
      await registerOrganizerWithKey({
        confirmationToken,
        username: trimmedUsername,
        password,
        email,
      });

      // Clear sensitive data immediately after successful registration
      setPassword('');
      setConfirmPassword('');
      setConfirmationToken('');

      // Show success message and redirect
      setShowSuccessMessage(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch (error) {
      const errorMsg = mapAuthError(error) || mapOrganizerKeyError(error);
      const sanitized = sanitizeErrorMessage(errorMsg);

      // Special handling for expired token
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        (error as any).status === 401 &&
        errorMsg.toLowerCase().includes('token')
      ) {
        setErrorMessage('Your verification token has expired. Please verify the key again.');
        setCurrentStep(1);
        setKeyInput(''); // Clear key so user must verify again
        setConfirmationToken('');
        setEmail('');
      } else {
        setErrorMessage(sanitized);
      }
    } finally {
      setIsRegistering(false);
    }
  }

  function handleGoBack() {
    setCurrentStep(1);
    setErrorMessage('');
    // Keep key input and Step 1 state
  }

  function handleCancel() {
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="page-header mx-6 md:mx-8 mt-4 md:mt-6 mb-8">
        <div className="header-content">
          <HeaderLogoLink />
          <div className="header-text">
            <h1 className="header-title">Organizer Registration</h1>
            <p className="header-subtitle">Join as an event organizer with your invitation key</p>
          </div>
        </div>

        <div className="header-toggle">
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 px-6 md:px-8 pb-8 max-w-6xl mx-auto w-full">
        <section className="signup-shell">
          <div className="signup-card">
            <div className="signup-card-glow" aria-hidden="true" />

            <div className="signup-card-content">
              {currentStep === 1 ? (
                <>
                  <p className="signup-eyebrow">STEP 1 OF 2</p>
                  <h2 className="signup-title">Verify Your Invitation Key</h2>
                  <p className="signup-description">
                    Enter your 32-character organizer invitation key to proceed.
                  </p>

                  <form className="signup-form" onSubmit={handleVerifyKey} noValidate>
                    <label className="signup-label" htmlFor="organizer-key">
                      Invitation Key
                    </label>
                    <input
                      id="organizer-key"
                      name="organizer-key"
                      type="text"
                      autoComplete="off"
                      placeholder="Enter your 32-character invitation key"
                      className="signup-input"
                      value={keyInput}
                      onChange={(event) => setKeyInput(event.target.value)}
                      disabled={isVerifying || isRateLimitedNow}
                      maxLength={32}
                    />

                    {errorMessage && (
                      <p className="signup-status signup-status-error">
                        <AlertCircle size={16} style={{ display: 'inline-block', marginRight: '8px' }} />
                        {errorMessage}
                      </p>
                    )}

                    {verifyAttempts > 2 && verifyAttempts < MAX_VERIFICATION_ATTEMPTS && (
                      <p className="signup-status signup-status-warning">
                        ⚠️ {MAX_VERIFICATION_ATTEMPTS - verifyAttempts} attempts remaining
                      </p>
                    )}

                    <div className="signup-actions">
                      <button
                        type="submit"
                        className="signup-btn signup-btn-primary"
                        disabled={isVerifying || !keyInput.trim() || isRateLimitedNow}
                      >
                        {isVerifying ? 'Verifying...' : 'Verify Key'}
                      </button>

                      <button
                        type="button"
                        className="signup-btn signup-btn-secondary"
                        onClick={handleCancel}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <p className="signup-eyebrow">STEP 2 OF 2</p>
                  <h2 className="signup-title">Complete Your Registration</h2>
                  <p className="signup-description">You're almost there! Fill in your account details.</p>

                  {isTokenExpiring && (
                    <div className="signup-status signup-status-warning" style={{ marginBottom: '16px' }}>
                      ⚠️ Your verification token expires in less than 2 minutes. Please hurry!
                    </div>
                  )}

                  <form className="signup-form" onSubmit={handleRegister} noValidate>
                    <label className="signup-label" htmlFor="organizer-email">
                      Email
                    </label>
                    <input
                      id="organizer-email"
                      name="email"
                      type="email"
                      className="signup-input"
                      value={email}
                      disabled
                      style={{ opacity: 0.6, cursor: 'not-allowed' }}
                    />
                    <p className="signup-helper" style={{ fontSize: '12px', marginTop: '4px' }}>
                      Email verified from your invitation key
                    </p>

                    <label className="signup-label" htmlFor="organizer-username">
                      Username
                    </label>
                    <input
                      id="organizer-username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      placeholder="Choose a username (3-50 characters)"
                      className="signup-input"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      disabled={isRegistering}
                    />

                    <label className="signup-label" htmlFor="organizer-password">
                      Password
                    </label>
                    <input
                      id="organizer-password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Create a password (at least 12 characters)"
                      className="signup-input"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={isRegistering}
                    />

                    <label className="signup-label" htmlFor="organizer-confirm-password">
                      Confirm Password
                    </label>
                    <input
                      id="organizer-confirm-password"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Type your password again"
                      className="signup-input"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      disabled={isRegistering}
                    />

                    {errorMessage && (
                      <p className="signup-status signup-status-error">
                        <AlertCircle size={16} style={{ display: 'inline-block', marginRight: '8px' }} />
                        {errorMessage}
                      </p>
                    )}

                    {showSuccessMessage && (
                      <p className="signup-status signup-status-success">
                        <CheckCircle size={16} style={{ display: 'inline-block', marginRight: '8px' }} />
                        Account created! Redirecting to login...
                      </p>
                    )}

                    <div className="signup-actions">
                      <button
                        type="submit"
                        className="signup-btn signup-btn-primary"
                        disabled={isRegistering || showSuccessMessage}
                      >
                        {isRegistering ? 'Creating Account...' : 'Complete Registration'}
                      </button>

                      <button
                        type="button"
                        className="signup-btn signup-btn-secondary"
                        onClick={handleGoBack}
                        disabled={isRegistering}
                      >
                        <ArrowLeft size={16} />
                        Go Back
                      </button>
                    </div>
                  </form>

                  <div className="signup-links-row">
                    <button
                      type="button"
                      className="signup-link"
                      onClick={handleCancel}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
