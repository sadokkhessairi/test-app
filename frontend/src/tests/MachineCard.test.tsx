import { render, screen } from '@testing-library/react'
import { MachineCard } from '../components/MachineCard'

const mockMachine = {
  id: 'M1',
  name: 'Machine 1',
  temperature: 75.0,
  vibration: 2.5,
  pression: 5.0,
  status: 'normal',
}

test('renders machine name', () => {
  render(<MachineCard machine={mockMachine} />)
  expect(screen.getByText('Machine 1')).toBeInTheDocument()
})

test('renders all three metrics', () => {
  render(<MachineCard machine={mockMachine} />)
  expect(screen.getByText(/75/)).toBeInTheDocument()   // temperature
  expect(screen.getByText(/2.5/)).toBeInTheDocument()  // vibration
  expect(screen.getByText(/5/)).toBeInTheDocument()    // pression
})

test('shows warning style when temperature is high', () => {
  const hotMachine = { ...mockMachine, temperature: 85.0, status: 'warning' }
  render(<MachineCard machine={hotMachine} />)
  // adjust selector to match your actual warning class/element
  expect(screen.getByTestId('machine-status')).toHaveClass('warning')
})
