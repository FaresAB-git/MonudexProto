import '@testing-library/dom'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

global.google = {
  maps: {
    DirectionsService: vi.fn().mockImplementation(() => ({
      route: vi.fn((request, callback) => {
        callback({ routes: [] }, 'OK')
      })
    })),
    DirectionsRenderer: vi.fn(),
    TravelMode: {
      WALKING: 'WALKING'
    },
    Map: vi.fn(),
    Marker: vi.fn(),
    Polyline: vi.fn(),
    LatLng: vi.fn()
  }
}
