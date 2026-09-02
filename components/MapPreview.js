import React from "react";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../theme";

export default function MapPreview({ latitude, longitude }) {
  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      style={{ flex: 1 }}
      customMapStyle={[
        { elementType: "geometry", stylers: [{ color: "#131925" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#94A3B8" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#0A0E1A" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#1A2133" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#0A0E1A" }] },
      ]}
      initialRegion={{
        latitude,
        longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      }}
      scrollEnabled={false}
      zoomEnabled={false}
      pitchEnabled={false}
      rotateEnabled={false}
    >
      <Marker coordinate={{ latitude, longitude }}>
        <MaterialCommunityIcons
          name="map-marker"
          size={32}
          color={theme.colors.accentBrand}
          style={{ marginTop: -16 }}
        />
      </Marker>
    </MapView>
  );
}
