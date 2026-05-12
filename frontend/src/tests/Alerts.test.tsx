import { render, screen } from '@testing-library/react'
import Alerts from '../pages/Alerts'

const mockAlerts = [
  {
    id: 'M1-temperature-999',
    machineId: 'M1',
    metric: 'temperature',
    value: 96.0,
    threshold: 95.0,
    severity: 'CRITICAL',
    timestamp: Date.now(),
    status: 'Active',
  },
  {
    id: 'M1-vibration-888',
    machineId: 'M1',
    metric: 'vibration',
    value: 4.0,
    threshold: 3.5,
    severity: 'WARNING',
    timestamp: Date.now(),
    status: 'Active',
  },
]

test('renders alert list', () => {
  render(<Alerts alerts={mockAlerts} />)
  expect(screen.getByText(/CRITICAL/i)).toBeInTheDocument()
  expect(screen.getByText(/WARNING/i)).toBeInTheDocument()
})

test('shows machine ID in alert', () => {
  render(<Alerts alerts={mockAlerts} />)
  expect(screen.getAllByText(/M1/).length).toBeGreaterThan(0)
})

test('shows empty state when no alerts', () => {
  render(<Alerts alerts={[]} />)
  expect(screen.getByText(/no alerts/i)).toBeInTheDocument()
})
