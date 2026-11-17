import React, { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { useAuth } from '../context/AuthContext.js';
import { useFacilities, useNearestFacility } from '../hooks/useFacilities.js';
import type { HealthFacility } from '@medwatch/shared';

export default function FacilityMapPage() {
  const { user } = useAuth();
  const isFacility = user?.role === 'facility';
  const isDistrict = user?.role === 'district';

  const { data, isPending } = useFacilities(1, 100);
  const [nearParams, setNearParams] = useState({ medicineId: '', lng: '', lat: '', minQty: '1' });
  const [query, setQuery] = useState<{ medicineId: string; lng: number; lat: number; minQty: number } | null>(null);
  const nearest = useNearestFacility(query);

  if (isFacility) {
    return (
      <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
          Role Notice
        </h2>
        <p style={{ fontSize: 13, margin: 0, color: 'var(--text-muted)' }}>
          Geographical facility mapping is designated for District, National, and Administrator oversight. Facility operations are managed in Dashboard, Alerts, Stock Records, and Requests.
        </p>
      </div>
    );
  }

  const rawFacilities = data?.data ?? [];
  const facilities = isDistrict && user?.district
    ? rawFacilities.filter((f: HealthFacility) => f.district === user.district)
    : rawFacilities;

  const center: [number, number] = isDistrict ? [0.72, 32.45] : [1.5, 32.0];
  const zoom: number = isDistrict ? 9 : 7;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 className="page-title">Facility map</h1>
        <p className="page-subtitle">
          {isDistrict
            ? `Facility locations and stock surveillance for ${user?.district ?? 'Nakaseke'} District`
            : 'Nationwide health facility locations and stock status'}
        </p>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Stock-out',  color: 'var(--status-critical)' },
          { label: 'Low stock',  color: 'var(--status-medium)' },
          { label: 'Healthy',    color: 'var(--status-healthy)' },
        ].map(l => (
          <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-secondary)' }}>
            <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, display: 'inline-block', flexShrink: 0 }} />
            {l.label}
          </span>
        ))}
      </div>

      {/* Map */}
      {isPending && <div className="skeleton" style={{ height: 440, borderRadius: 'var(--radius-lg)' }} />}
      {!isPending && (
        <div style={{ height: 440, border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {facilities.map((f: HealthFacility) => (
              <CircleMarker
                key={f._id}
                center={[f.location.coordinates[1], f.location.coordinates[0]]}
                radius={7}
                pathOptions={{ fillColor: '#2563eb', color: '#1d4ed8', fillOpacity: 0.85, weight: 1.5 }}
              >
                <Popup>
                  <div style={{ fontFamily: 'inherit', fontSize: 13 }}>
                    <strong>{f.name}</strong><br />
                    {f.level} — {f.district}<br />
                    In charge: {f.in_charge.name}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* Find nearest */}
      <div className="card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px' }}>
          Find nearest facility with stock
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end' }}>
          {([
            { key: 'medicineId', label: 'Medicine ID',  placeholder: 'MED002' },
            { key: 'lng',        label: 'Longitude',    placeholder: '32.45' },
            { key: 'lat',        label: 'Latitude',     placeholder: '0.72' },
            { key: 'minQty',     label: 'Min quantity', placeholder: '1' },
          ] as const).map(({ key, label, placeholder }) => (
            <div key={key}>
              <label htmlFor={`near-${key}`} style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6 }}>
                {label}
              </label>
              <input
                id={`near-${key}`}
                value={nearParams[key]}
                onChange={e => setNearParams(p => ({ ...p, [key]: e.target.value }))}
                className="input"
                style={{ width: 120 }}
                placeholder={placeholder}
              />
            </div>
          ))}
          <button
            className="btn-primary"
            onClick={() => setQuery({ medicineId: nearParams.medicineId, lng: Number(nearParams.lng), lat: Number(nearParams.lat), minQty: Number(nearParams.minQty) })}
            disabled={!nearParams.medicineId || !nearParams.lng || !nearParams.lat}
          >
            Search
          </button>
        </div>

        {nearest.isPending && <p style={{ marginTop: 14, fontSize: 13, color: 'var(--text-secondary)' }}>Searching...</p>}
        {nearest.data && nearest.data.length === 0 && <p style={{ marginTop: 14, fontSize: 13, color: 'var(--text-muted)' }}>No facilities found with that stock.</p>}
        {nearest.data && nearest.data.length > 0 && (
          <div style={{ marginTop: 14, overflow: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Facility</th><th>District</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Distance</th></tr></thead>
              <tbody>
                {nearest.data.map((f: HealthFacility & { distance_m?: number; closing?: number }) => (
                  <tr key={f._id}>
                    <td style={{ fontWeight: 500 }}>{f.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{f.district}</td>
                    <td className="tabular" style={{ textAlign: 'right' }}>{f.closing}</td>
                    <td className="tabular" style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {f.distance_m != null ? `${(f.distance_m / 1000).toFixed(1)} km` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
