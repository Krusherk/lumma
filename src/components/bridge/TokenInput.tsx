import { type ChangeEvent } from 'react'
import './TokenInput.css'

interface TokenInputProps {
  value: string
  onChange: (value: string) => void
  token: string
  tokenColor: string
  tokenIcon: string
  balance?: string
  label: string
  readOnly?: boolean
}

export default function TokenInput({
  value, onChange, token, tokenColor, tokenIcon, balance, label, readOnly = false,
}: TokenInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val === '' || /^\d*\.?\d*$/.test(val)) onChange(val)
  }

  return (
    <div className={`ti ${readOnly ? 'readonly' : ''}`}>
      <div className="ti-head">
        <span className="ti-label">{label}</span>
        {balance && (
          <button className="ti-balance" onClick={() => !readOnly && onChange(balance)} type="button">
            Bal: <span className="ti-bal-val">{balance}</span>
            {!readOnly && <span className="ti-max">MAX</span>}
          </button>
        )}
      </div>
      <div className="ti-row">
        <input
          className="ti-field"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={value}
          onChange={handleChange}
          readOnly={readOnly}
          autoComplete="off"
        />
        <div className="ti-badge">
          <span className="ti-icon" style={{ background: tokenColor }}>{tokenIcon}</span>
          <span className="ti-symbol">{token}</span>
        </div>
      </div>
    </div>
  )
}
