/**
 * useSocket.io.jsx - Socket.IO hook for real-time updates
 * Handles connection, rooms, and event listeners for emergency routing
 * Reconnection and auth token renewal on socket disconnect
 */

import { useEffect, useRef } from 'react'
import io from 'socket.io-client'

// Socket.IO connection - reads from httpOnly cookies automatically
// The browser client will connect to the same origin as the API
const initializeSocket = () => {
  const socket = io(process.env.VITE_API_URL || 'http://localhost:4000', {
    withCredentials: true,
    autoConnect: false,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000,
  })

  return socket
}

export const useSocketIO = () => {
  const socketRef = useRef(null)
  const [socket, setSocket] = useRef(null)

  useEffect(() => {
    const newSocket = initializeSocket()
    setSocket(newSocket)
    socketRef.current = newSocket

    // Connect after a short delay to ensure cookies are set
    const connectSocket = () => {
      newSocket.connect()

      newSocket.on('connect', () => {
        console.log('✅ Socket.IO connected:', newSocket.id)
      })

      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket.IO connect error:', error)
      })

      newSocket.on('disconnect', (reason) => {
        console.log('🔌 Socket.IO disconnected:', reason)
        // Attempt reconnect after a delay
        setTimeout(() => {
          newSocket.connect()
        }, 3000)
      })

      return () => {
        newSocket.disconnect()
      }
    }

    connectSocket()

    // Return cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [])

  // Helper to emit events
  const emit = (event, data) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data)
    }
  }

  // Helper to listen for events
  const on = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback)
      // Return cleanup function
      return () => {
        socketRef.current.off(event, callback)
      }
    }
    return () => {}
  }

  // Helper to off listeners
  const off = (event) => {
    if (socketRef.current) {
      socketRef.current.off(event)
    }
  }

  // Get current socket instance
  const getSocket = () => socketRef.current

  return {
    socket: getSocket() || socket.current,
    connect: () => {
      if (socketRef.current) {
        socketRef.current.connect()
      }
    },
    disconnect: () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    },
    emit,
    on,
    off,
  }
}