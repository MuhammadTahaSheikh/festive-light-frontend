import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/index.js';

function useDebouncedCallback(fn, ms) {
  const timer = useRef(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return (...args) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), ms);
  };
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Start typing your street address',
  className = '',
}) {
  const wrapRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const search = useDebouncedCallback(async (q) => {
    const trimmed = q.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.autocomplete(trimmed);
      const items = data.suggestions || [];
      setSuggestions(items);
      setOpen(true);
    } catch {
      setSuggestions([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, 250);

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  function handleInput(e) {
    const next = e.target.value;
    onChange(next);
    onSelect?.({ placeId: '', full: next, lat: null, lng: null });
    search(next);
  }

  function pick(item) {
    onChange(item.full);
    onSelect?.({
      placeId: item.placeId || '',
      full: item.full,
      lat: item.lat ?? null,
      lng: item.lng ?? null,
    });
    setOpen(false);
  }

  return (
    <div className={`acw ${className}`.trim()} ref={wrapRef}>
      <input
        value={value}
        autoComplete="off"
        placeholder={placeholder}
        onChange={handleInput}
        onFocus={() => { if (suggestions.length) setOpen(true); }}
      />
      <div className={'sug' + (open ? ' open' : '')}>
        {loading && !suggestions.length && (
          <div className="msg">Searching…</div>
        )}
        {!loading && open && !suggestions.length && value.trim().length >= 3 && (
          <div className="msg">No matches — you can still type the full address.</div>
        )}
        {suggestions.map((s, i) => (
          <div
            key={s.placeId || `${s.full}-${i}`}
            className="si"
            role="button"
            tabIndex={0}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick(s)}
            onKeyDown={(e) => { if (e.key === 'Enter') pick(s); }}
          >
            <div className="m">{s.main}</div>
            {s.secondary && <div className="s">{s.secondary}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
