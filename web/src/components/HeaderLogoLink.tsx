import { Link, useLocation } from 'react-router-dom';

const LOGO_SRC = 'https://firebasestorage.googleapis.com/v0/b/dtuevent-8105b.firebasestorage.app/o/picture%2Fdtulogo.png?alt=media&token=7e86de6e-f1f4-471d-8354-70ad70bafe14';

export function HeaderLogoLink() {
    const location = useLocation();
    const isHomePage = location.pathname === '/';
    const tooltip = isHomePage ? 'Home (refresh page)' : 'Go to home';

    return (
        <Link
            to="/"
            reloadDocument={isHomePage}
            aria-label={isHomePage ? 'Refresh the main page' : 'Go to the main page'}
            title={tooltip}
            className="header-logo-link group relative"
        >
            <img src={LOGO_SRC} alt="DTU Logo" className="header-logo" />
            <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-subtle)] opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
            >
                {tooltip}
            </span>
        </Link>
    );
}