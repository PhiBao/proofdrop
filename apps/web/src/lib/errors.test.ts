import { describe, expect, it } from 'vitest'

import { friendlyError } from './errors'

describe('friendlyError', () => {
  it('turns a viem user rejection into one short line', () => {
    const error = Object.assign(
      new Error(
        'User rejected the request. Request Arguments: from: 0x1111111111111111111111111111111111111111 to: 0x2D2d8bba04Ed8aF72d989b172725B447D4954eBb value: 5.05 ETH data: 0x0ffbf4ae Contract Call: function: createDraw(...) https://viem.sh/docs/contract/writeContract Details: User rejected the request. Version: viem@2.57.11',
      ),
      { code: 4001 },
    )

    expect(friendlyError(error)).toBe('You cancelled the request in your wallet.')
  })

  it('preserves a short API error', () => {
    expect(friendlyError(new Error('Draw not found'))).toBe('Draw not found')
  })

  it('maps insufficient funds', () => {
    expect(friendlyError(new Error('insufficient funds for gas * price + value'))).toBe(
      'Not enough OKB to cover the prize and network fee.',
    )
  })
})
