/**
 * Sample Component: LiveVenueMap
 *
 * Demonstrates Mövee's real-time venue tracking using:
 * - React Native New Architecture (Fabric renderer)
 * - Supabase Realtime for live updates
 * - PostGIS for geospatial queries
 */

import { useEffect, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import MapView, { Marker, Circle } from 'react-native-maps'
import { supabase } from '@/lib/supabase'

interface Venue {
  id: string
  name: string
  location: {
    type: 'Point'
    coordinates: [number, number] // [longitude, latitude]
  }
  current_capacity: number
  max_capacity: number
}

interface UserLocation {
  latitude: number
  longitude: number
}

export function LiveVenueMap({ userLocation }: { userLocation: UserLocation }) {
  const [venues, setVenues] = useState<Venue[]>([])
  const [searchRadius] = useState(5000) // 5km in meters

  useEffect(() => {
    // Initial fetch of nearby venues using PostGIS
    fetchNearbyVenues()

    // Subscribe to real-time capacity updates
    const channel = supabase
      .channel('venue-capacity-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'venues',
          filter: `id=in.(${venues.map(v => v.id).join(',')})`
        },
        (payload) => {
          // Update venue capacity in real-time
          setVenues(prev =>
            prev.map(v =>
              v.id === payload.new.id
                ? { ...v, current_capacity: payload.new.current_capacity }
                : v
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userLocation])

  async function fetchNearbyVenues() {
    // PostGIS query to find venues within radius
    const { data, error } = await supabase.rpc('nearby_venues', {
      lat: userLocation.latitude,
      lng: userLocation.longitude,
      radius_meters: searchRadius
    })

    if (error) {
      console.error('Error fetching venues:', error)
      return
    }

    setVenues(data)
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05
        }}
      >
        {/* User location */}
        <Marker
          coordinate={userLocation}
          title="You"
          pinColor="blue"
        />

        {/* Search radius circle */}
        <Circle
          center={userLocation}
          radius={searchRadius}
          strokeColor="rgba(0,122,255,0.3)"
          fillColor="rgba(0,122,255,0.1)"
        />

        {/* Venue markers */}
        {venues.map(venue => {
          const [lng, lat] = venue.location.coordinates
          const capacityPercent = (venue.current_capacity / venue.max_capacity) * 100
          const pinColor = capacityPercent > 80 ? 'red' : capacityPercent > 50 ? 'orange' : 'green'

          return (
            <Marker
              key={venue.id}
              coordinate={{ latitude: lat, longitude: lng }}
              title={venue.name}
              description={`${venue.current_capacity}/${venue.max_capacity} (${capacityPercent.toFixed(0)}%)`}
              pinColor={pinColor}
            />
          )
        })}
      </MapView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  map: {
    width: '100%',
    height: '100%'
  }
})
