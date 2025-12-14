// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Polyfill TextEncoder/TextDecoder for Node.js environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Polyfill structuredClone for Node.js < 17 (required by Anchor)
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj))
}

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SOLANA_CLUSTER = 'devnet'
process.env.NEXT_PUBLIC_SOLANA_RPC_URL = 'https://api.devnet.solana.com'
process.env.NEXT_PUBLIC_ZOL_PROGRAM_ID = 'Hxmj5SzEPU4gJkbQHWaaXHEQN7SK1CKEuUFhvUf8qBAv'
process.env.NEXT_PUBLIC_USDC_MINT = 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'

// Mock window.matchMedia for components that use it
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})
