type ErrorLike = {
  code?: number | string
  shortMessage?: string
  message?: string
  cause?: unknown
}

function errorCode(error: unknown): number | string | undefined {
  let current = error as ErrorLike | undefined
  for (let depth = 0; depth < 4 && current; depth += 1) {
    if (current.code !== undefined) return current.code
    current = current.cause as ErrorLike | undefined
  }
  return undefined
}

/**
 * Turn raw wallet/viem errors into one short line for the UI. Viem includes
 * calldata, addresses and docs links in `message`; those belong in the console,
 * not in a toast.
 */
export function friendlyError(error: unknown): string {
  const err = (error ?? {}) as ErrorLike
  const message = err.shortMessage?.trim() || err.message?.trim() || String(error)
  const code = errorCode(error)

  if (
    code === 4001 ||
    code === 'ACTION_REJECTED' ||
    /user rejected|rejected the request|user denied|denied transaction/i.test(message)
  ) {
    return 'You cancelled the request in your wallet.'
  }

  if (/insufficient funds|exceeds balance|insufficient balance/i.test(message)) {
    return 'Not enough OKB to cover the prize and network fee.'
  }

  if (/chain mismatch|wrong chain|does not match the target chain/i.test(message)) {
    return 'Switch your wallet to X Layer and try again.'
  }

  if (/nonce too low|replacement transaction underpriced/i.test(message)) {
    return 'The wallet nonce is out of date. Reset the account in your wallet and try again.'
  }

  if (err.shortMessage?.trim()) return err.shortMessage.trim()

  const firstLine = message
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean)

  const clean = firstLine ?? 'Something went wrong. Please try again.'
  return clean.length > 200 ? `${clean.slice(0, 197)}…` : clean
}
