// src/components/MapPicker.tsx
//
// A location picker built on Leaflet + OpenStreetMap tiles. Deliberately
// dependency-free: the map runs inside an iframe (web) or WebView (native),
// so there's no react-native-maps install and no Google API key/billing.
//
// Communication with the map is done through postMessage.

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/theme/theme';

export interface LatLng {
  lat: number;
  lng: number;
}

/** An area to shade on the map (used to visualise selected coverage). */
export interface HighlightArea {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

interface Props {
  value: LatLng | null;
  onChange: (coords: LatLng) => void;
  /** Circle radius in km to draw around the pin (provider coverage). */
  radiusKm?: number;
  /** Areas to shade on the map — e.g. the areas a provider has selected. */
  highlightedAreas?: HighlightArea[];
  height?: number;
  /** View-only: the pin can't be moved and the location controls are hidden. */
  readonly?: boolean;
}

// Bahrain's approximate centre — a sensible default view.
const DEFAULT_CENTER: LatLng = { lat: 26.0667, lng: 50.5577 };

function buildMapHtml(
  center: LatLng,
  marker: LatLng | null,
  radiusKm?: number,
  readonly = false
): string {
  const m = marker ?? center;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; }
  .leaflet-container { background: #f2efe9; font-family: system-ui, sans-serif; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: true }).setView([${m.lat}, ${m.lng}], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  var marker = L.marker([${m.lat}, ${m.lng}], { draggable: ${!readonly} }).addTo(map);

  // Layer holding the shaded "areas I cover" circles.
  var areaLayer = L.layerGroup().addTo(map);
  function renderAreas(areas) {
    areaLayer.clearLayers();
    if (!areas || !areas.length) return;
    var bounds = [];
    areas.forEach(function (a) {
      L.circle([a.lat, a.lng], {
        radius: 2200,
        color: '#2E7D5B',
        fillColor: '#2E7D5B',
        fillOpacity: 0.22,
        weight: 1.5
      }).addTo(areaLayer).bindTooltip(a.label, { permanent: false, direction: 'top' });
      bounds.push([a.lat, a.lng]);
    });
    if (bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds).pad(0.35));
    }
  }
  var circle = null;
  ${
    radiusKm
      ? `circle = L.circle([${m.lat}, ${m.lng}], { radius: ${radiusKm * 1000}, color: '#D9A15C', fillColor: '#D9A15C', fillOpacity: 0.15, weight: 2 }).addTo(map);`
      : ''
  }

  function send(lat, lng) {
    var payload = JSON.stringify({ type: 'location', lat: lat, lng: lng });
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(payload);
    } else if (window.parent) {
      window.parent.postMessage(payload, '*');
    }
  }

  function place(lat, lng) {
    marker.setLatLng([lat, lng]);
    if (circle) circle.setLatLng([lat, lng]);
    send(lat, lng);
  }

  ${
    readonly
      ? '// View-only map: taps and drags do not move the pin.'
      : `map.on('click', function (e) { place(e.latlng.lat, e.latlng.lng); });
  marker.on('dragend', function (e) {
    var p = e.target.getLatLng();
    place(p.lat, p.lng);
  });`
  }

  // Allow the app to drive the map (e.g. "use my location", search result).
  window.addEventListener('message', function (event) {
    try {
      var data = JSON.parse(typeof event.data === 'string' ? event.data : '{}');
      if (data.type === 'setLocation') {
        map.setView([data.lat, data.lng], data.zoom || 15);
        place(data.lat, data.lng);
      }
      if (data.type === 'setRadius' && circle) {
        circle.setRadius(data.km * 1000);
      }
      if (data.type === 'setAreas') {
        renderAreas(data.areas);
      }
    } catch (err) {}
  });
</script>
</body>
</html>`;
}

export default function MapPicker({
  value,
  onChange,
  radiusKm,
  highlightedAreas,
  height = 260,
  readonly = false,
}: Props) {
  const center = value ?? DEFAULT_CENTER;
  const frameRef = useRef<any>(null);
  const [locating, setLocating] = useState(false);
  // Build the HTML once so typing/dragging doesn't reload the whole map.
  const [html] = useState(() => buildMapHtml(center, value, radiusKm, readonly));

  // Receive coordinates from the map (web).
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    function handler(event: MessageEvent) {
      try {
        const data = JSON.parse(typeof event.data === 'string' ? event.data : '{}');
        if (data.type === 'location') onChange({ lat: data.lat, lng: data.lng });
      } catch {}
    }
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onChange]);

  // Push updates into the map without rebuilding it.
  const postToMap = useCallback((msg: object) => {
    const payload = JSON.stringify(msg);
    if (Platform.OS === 'web') {
      frameRef.current?.contentWindow?.postMessage(payload, '*');
    } else {
      frameRef.current?.postMessage?.(payload);
    }
  }, []);

  useEffect(() => {
    if (radiusKm) postToMap({ type: 'setRadius', km: radiusKm });
  }, [radiusKm, postToMap]);

  // Re-draw the shaded coverage whenever the selection changes. The small
  // delay on first run gives the iframe time to finish loading Leaflet.
  const areasKey = (highlightedAreas ?? []).map((a) => a.id).join(',');
  useEffect(() => {
    const send = () => postToMap({ type: 'setAreas', areas: highlightedAreas ?? [] });
    send();
    const t = setTimeout(send, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areasKey, postToMap]);

  function useMyLocation() {
    setLocating(true);
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          onChange(coords);
          postToMap({ type: 'setLocation', ...coords, zoom: 16 });
          setLocating(false);
        },
        () => {
          setLocating(false);
          if (Platform.OS === 'web') {
            window.alert('Could not get your location. Please allow location access, or drop the pin manually.');
          }
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocating(false);
    }
  }

  return (
    <View>
      <View style={[styles.mapWrap, { height }]}>
        {Platform.OS === 'web' ? (
          // @ts-ignore — iframe is web-only, and react-native-web renders it fine.
          <iframe
            ref={frameRef}
            srcDoc={html}
            style={{ border: 'none', width: '100%', height: '100%' }}
            title="Pick location"
          />
        ) : (
          <View style={styles.nativeFallback}>
            <Ionicons name="map-outline" size={28} color={colors.textMuted} />
            <Text style={styles.fallbackText}>
              Map picking is available on the web version.
            </Text>
          </View>
        )}
      </View>

      {!readonly && (
      <View style={styles.controls}>
        <TouchableOpacity style={styles.locateBtn} onPress={useMyLocation} disabled={locating}>
          {locating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="locate" size={18} color={colors.primary} />
          )}
          <Text style={styles.locateText}>Use my current location</Text>
        </TouchableOpacity>
      </View>
      )}

      {!readonly && value && (
        <Text style={styles.coords}>
          Pin: {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
        </Text>
      )}
      {!readonly && (
        <Text style={styles.hint}>Tap the map or drag the pin to set the exact spot.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mapWrap: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#f2efe9',
  },
  nativeFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  fallbackText: { ...typography.bodySecondary, textAlign: 'center', paddingHorizontal: spacing.lg },
  controls: { flexDirection: 'row', marginTop: spacing.sm },
  locateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
  },
  locateText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  coords: { ...typography.caption, marginTop: spacing.sm },
  hint: { ...typography.caption, marginTop: 2 },
});
