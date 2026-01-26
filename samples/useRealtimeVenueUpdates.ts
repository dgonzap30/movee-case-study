/**
 * Sample Hook: useRealtimeVenueUpdates
 *
 * Demonstrates Mövee's Supabase Realtime integration for
 * live venue capacity tracking and friend location updates.
 */

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface VenueUpdate {
  id: string
  name: string
  current_capacity: number
  max_capacity: number
  timestamp: string
}

interface FriendLocation {
  user_id: string
  username: string
  venue_id: string | null
  venue_name: string | null
  last_updated: string
}

/**
 * Subscribes to real-time venue capacity changes and friend location updates.
 *
 * Uses Supabase Realtime Broadcast for friend locations (ephemeral data)
 * and Postgres Changes for venue capacity (persisted data).
 */
export function useRealtimeVenueUpdates() {
  const [venueUpdates, setVenueUpdates] = useState<VenueUpdate[]>([])
  const [friendLocations, setFriendLocations] = useState<Map<string, FriendLocation>>(new Map())

  useEffect(() => {
    // Create a single channel for both venue updates and friend locations
    const channel: RealtimeChannel = supabase.channel('movee-live-updates')

    // Subscribe to venue capacity changes (Postgres Changes)
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'venues',
        filter: 'current_capacity=neq.prev_current_capacity' // Only when capacity actually changes
      },
      (payload) => {
        const update: VenueUpdate = {
          id: payload.new.id,
          name: payload.new.name,
          current_capacity: payload.new.current_capacity,
          max_capacity: payload.new.max_capacity,
          timestamp: new Date().toISOString()
        }

        setVenueUpdates(prev => [update, ...prev].slice(0, 50)) // Keep last 50 updates
      }
    )

    // Subscribe to friend location broadcasts (Broadcast)
    channel.on(
      'broadcast',
      { event: 'friend-location' },
      (payload) => {
        const location: FriendLocation = payload.payload

        setFriendLocations(prev => {
          const updated = new Map(prev)
          updated.set(location.user_id, location)
          return updated
        })
      }
    )

    // Subscribe to the channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Connected to Mövee live updates')
      }
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  /**
   * Broadcast current user's location to friends
   */
  const broadcastMyLocation = async (venueId: string | null, venueName: string | null) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const channel = supabase.channel('movee-live-updates')
    await channel.send({
      type: 'broadcast',
      event: 'friend-location',
      payload: {
        user_id: user.id,
        username: user.user_metadata.username,
        venue_id: venueId,
        venue_name: venueName,
        last_updated: new Date().toISOString()
      }
    })
  }

  return {
    venueUpdates,
    friendLocations: Array.from(friendLocations.values()),
    broadcastMyLocation
  }
}
