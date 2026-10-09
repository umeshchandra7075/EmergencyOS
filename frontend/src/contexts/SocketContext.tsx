import React, { createContext, useContext, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'

interface SocketContextType {
  socket: Socket | null
  connected: boolean
  joinIncident: (incidentId: string) => void
  sendLocationUpdate: (data: {
    vehicleId: string
    coordinates: [number, number]
    heading?: number
    speed?: number
    incidentId?: string
  }) => void
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  joinIncident: () => {},
  sendLocationUpdate: () => {},
})

export const useSocket = () => useContext(SocketContext)

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect()
        setSocket(null)
        setConnected(false)
      }
      return
    }

    const token = localStorage.getItem('emergencyos_token')
    const socketUrl = import.meta.env.VITE_API_URL || window.location.origin

    const newSocket = io(socketUrl, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    })

    newSocket.on('connect', () => {
      setConnected(true)
      console.log('⚡ Socket connected:', newSocket.id)
    })

    newSocket.on('disconnect', () => {
      setConnected(false)
      console.log('🔌 Socket disconnected')
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [user])

  const joinIncident = (incidentId: string) => {
    if (socket && connected) {
      socket.emit('incident:join', { incidentId })
    }
  }

  const sendLocationUpdate = (data: {
    vehicleId: string
    coordinates: [number, number]
    heading?: number
    speed?: number
    incidentId?: string
  }) => {
    if (socket && connected) {
      socket.emit('vehicle:location_update', data)
    }
  }

  return (
    <SocketContext.Provider value={{ socket, connected, joinIncident, sendLocationUpdate }}>
      {children}
    </SocketContext.Provider>
  )
}
