import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L, { LatLngBoundsExpression } from 'leaflet';

// Fix for default Leaflet icon path issues with bundlers
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export interface MapMarker {
  lat: number;
  lng: number;
  radius?: number; // Geofence radius in meters
  popupContent?: string | React.ReactNode;
}

interface MapViewProps {
  markers: MapMarker[];
  height?: string;
  zoom?: number;
}

export const MapView: React.FC<MapViewProps> = ({ markers, height = 'h-48', zoom = 13 }) => {
    if (markers.length === 0) {
        return <div className={`w-full bg-gray-200 flex items-center justify-center text-gray-500 ${height}`}>No location data</div>;
    }
    
    // If we have more than one marker, calculate the bounds to fit them all.
    const bounds: LatLngBoundsExpression | undefined = markers.length > 1 
        ? markers.map(m => [m.lat, m.lng] as [number, number])
        : undefined;

    // For a single marker, we'll use its position as the center.
    const center: [number, number] = [markers[0].lat, markers[0].lng];
    
    // A key helps React re-initialize the MapContainer when the view fundamentally changes (e.g., from center/zoom to bounds).
    const mapKey = JSON.stringify(bounds) || center.join(',');

    return (
        <div className={`${height} w-full rounded-md overflow-hidden my-2`}>
             <MapContainer 
                key={mapKey}
                center={bounds ? undefined : center} 
                zoom={bounds ? undefined : zoom} 
                bounds={bounds}
                boundsOptions={{ padding: [50, 50] }}
                scrollWheelZoom={false} 
                style={{ height: '100%', width: '100%' }}
             >
                <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {markers.map((marker, idx) => (
                    <React.Fragment key={idx}>
                        <Marker position={[marker.lat, marker.lng]}>
                            {marker.popupContent && <Popup>{marker.popupContent}</Popup>}
                        </Marker>
                        {marker.radius && (
                            <Circle
                                center={[marker.lat, marker.lng]}
                                pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
                                radius={marker.radius}
                            />
                        )}
                    </React.Fragment>
                ))}
            </MapContainer>
        </div>
    );
};