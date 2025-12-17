import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client.ts'
import './Start.css'

export default function EnterName() {
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  async function start() {
    const username = name.trim()
    if (!username) return
    setLoading(true)
    try {
      // post request to start session
      const res = await api.post('/start', { username }) 
      const session_id = res.data.session_id
        
      // store username and session_id in sessionStorage
      sessionStorage.setItem('username', username)
      sessionStorage.setItem('session_id', session_id)
      
      // navigate to tutor page
      nav('/tutor')
    } catch (error) {
        console.error('Failed to start session:', error)
        sessionStorage.removeItem('username')
        sessionStorage.removeItem('session_id')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container">
      <div className="login-bg">
        <div className="login-card-wrapper">
          <div className="login-card">
            <div className="avatar-circle">
              <div className="avatar-icon">👤</div>
            </div>
            <h2 className="login-title">Start Your SQL Learning</h2>
            <div className="input-wrapper">
              <input
                className="login-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            <button 
              className="login-button"
              onClick={start}
              disabled={loading}
            >
              {loading ? 'Starting...' : 'Start'}
            </button>
          </div>
        </div>      
      </div>
    </div>
  )
}

