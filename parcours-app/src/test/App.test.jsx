import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from '../App.jsx'

vi.mock('axios', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: { data: [] } }))
  }
}))

vi.mock('@react-google-maps/api', () => ({
  useJsApiLoader: () => ({ isLoaded: true, loadError: null }),
  GoogleMap: ({ children }) => <div data-testid="map">{children}</div>,
  Marker: () => <div data-testid="marker" />,
  Polyline: () => <div data-testid="polyline" />
}))

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders the app title', async () => {
    const axios = (await import('axios')).default
    axios.get.mockResolvedValue({ data: { data: [] } })
    render(<App />)
    expect(screen.getByText('Mes Parcours')).toBeDefined()
  })

  it('renders parcours list', async () => {
    const axios = (await import('axios')).default
    axios.get
      .mockResolvedValueOnce({ data: { data: [{ id: 1, name: 'Paris Centre', description: 'Parcours touristique' }] } })
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({ data: { data: [] } })

    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('Paris Centre')).toBeDefined()
    })
  })

  it('shows loading state', async () => {
    const axios = (await import('axios')).default
    axios.get.mockReturnValue(new Promise(() => {}))
    render(<App />)
    expect(screen.getAllByText('Chargement...').length).toBeGreaterThan(0)
  })

  it('shows error message on API failure', async () => {
    const axios = (await import('axios')).default
    axios.get.mockRejectedValue(new Error('Network error'))
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText(/Erreur/)).toBeDefined()
    })
  })

  it('shows empty message when no parcours', async () => {
    const axios = (await import('axios')).default
    axios.get.mockResolvedValue({ data: { data: [] } })
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('Aucun parcours')).toBeDefined()
    })
  })
})
