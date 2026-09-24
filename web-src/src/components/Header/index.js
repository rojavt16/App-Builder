
import React from 'react'
import { NavLink } from 'react-router-dom'

import './Header.css'

const LINKS = [
  { to: '/login', label: 'Log In' },
  { to: '/account', label: 'My Account' },
  { to: '/about', label: 'About App Builder' }
]

function Header () {
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__mark" aria-hidden="true">&#9679;</span>
        <span>Ecom Store</span>
      </div>

      <nav aria-label="Main">
        <ul className="app-header__nav">
          {LINKS.map(({ to, label }) => (
            <li key={to}>
              <NavLink
                className={({ isActive }) => `app-header__link ${isActive ? 'is-selected' : ''}`}
                to={to}
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}

export default Header
