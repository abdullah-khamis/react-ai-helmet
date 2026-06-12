// Route table used by the collection script to know what to render and at which
// URL. In a real app this is your router config / SSG manifest.
import Home from './pages/index.jsx'
import Pricing from './pages/pricing.jsx'

export const routes = [
  { path: '/',        title: 'Home',    priority: 'high', Component: Home },
  { path: '/pricing', title: 'Pricing', priority: 'high', Component: Pricing },
]
