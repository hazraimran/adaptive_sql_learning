import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client.ts'
import { useTypingCapture } from '../hooks/useTypingCapture.ts' 
import './SQLTutor.css'
import diagram from '../assets/diagram.png'

interface ResultType {
    error_type: string;
    error_subtype: string;
    personalized_feedback: string;
}

interface QuitResponseType {
  status: string;
  message: string;
  final_cluster_id: number; 
}

interface Persona {
  title: string;
  description: string;
  encouragement: string;
}

// Learner profile information based on clusters 0, 1, 2, 3, 4
const LearnerPersonas: Record<number, Persona> = {
  // Cluster 3 - Proficient Learner
  3: {
      title: "Proficient Learner",
      description: "Your data suggests: very fast typing speed, minimal key-flight time, and the fewest retries.",
      encouragement: "Excellent! Your learning efficiency and mastery of SQL concepts are impressive. Keep up this fast and precise pace; you are efficiently building a strong skill foundation!"
  },
  // Cluster 2 - Hesitant Explorer
  2: {
      title: "Hesitant Explorer",
      description: "Your data suggests: slow typing speed, long key-flight time, high deletion rate, and high number of retries.",
      encouragement: "Every step you take is well-thought-out, showing your focus on accuracy! High deletion and pause rates reflect your exploration and optimization of solutions. Remember, every revision deepens your knowledge, and this careful exploratory spirit leads to a more solid understanding."
  },
  // Cluster 0 - Analytical Thinker
  0: {
      title: "Analytical Thinker",
      description: "Your data suggests: moderate speed and retries, but the highest backspace rate.",
      encouragement: "You are an excellent Analytical Thinker! A high backspace rate shows you actively self-correct and fine-tune your input. This meticulous, detail-oriented approach ensures your code structure is rigorous. Maintaining this analytical habit will allow you to excel in complex SQL scenarios!"
  },
  // Cluster 4 - Fast Improviser
  4: {
      title: "Fast Improviser",
      description: "Your data suggests: above-average typing speed, shortest key dwell time, but a high number of retries.",
      encouragement: "Your learning style is 'Act Fast, Improve Faster'! You are bold in trying and quick to iterate, showing strong adaptability and motivation. Speed and high action capability are your strengths; combining them with rapid practice will accelerate your SQL skills!"
  },
  // Cluster 1 - Careful Refiner
  1: {
      title: "Careful Refiner",
      description: "Your data suggests: moderate typing speed, longest key dwell time, and the highest number of retries.",
      encouragement: "You invest focused thought into every key press—you are a very Careful Refiner! Long dwell times and high retries suggest you strive for perfection in every detail. This dedication to quality is an essential trait for becoming an expert. Applaud your focus and hard work!"
  },
};


export default function SQLTutor() {
  const nav = useNavigate()
  const username = sessionStorage.getItem('username') || ''
  const session_id = sessionStorage.getItem('session_id') || ''
  const [query, setQuery] = useState('')
  const [locked, setLocked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ResultType | null>(null) 
  const [attempts, setAttempts] = useState(0)
 
  const [showQuitModal, setShowQuitModal] = useState(false)
  const [finalClusterId, setFinalClusterId] = useState<number | null>(null) 
  const [showSchema, setShowSchema] = useState(false);

  const { events, reset } = useTypingCapture(!locked) 

  useEffect(() => {
    if (!username || !session_id) { 
        nav('/')
    }
  }, [username, session_id, nav])

  async function handleSubmit() {
    if (!query.trim() || loading || locked) return 
    
    setLocked(true)
    setLoading(true)

    try {
      const res = await api.post('/submit_query', { username, session_id, query, events })
      setResult(res.data as ResultType)
      setAttempts(a => a + 1)
      reset()
    } catch(e) {
        console.error("Submission failed:", e)
        setResult({
            error_type: "API_ERROR",
            error_subtype: "NETWORK_ERROR",
            personalized_feedback: "Failed to submit query. Please try again."
        })
    } finally {
      setLoading(false)
    }
  }

  async function handleRetry() {
    if (loading) return
    
    // Unlock for retry
    setLocked(false)
    setQuery('') 
  
  }

  function handleQuit() {
    if (loading) return
    setShowQuitModal(true);
  }

  async function confirmQuit() {
      setShowQuitModal(false);
      setLoading(true);

      // send end_session request
      try {
          const res = await api.post('/end_session', { username, session_id });
          const data = res.data as QuitResponseType;
          
          // get and set the final cluster ID from the backend
          setFinalClusterId(data.final_cluster_id); 
          console.log(`Session ended. Final Cluster ID: ${data.final_cluster_id}`);
      } catch(e) {
          console.warn("Failed to end session gracefully:", e);
          // Use -2 to indicate session end failure
          setFinalClusterId(-2); 
      } finally {
          setLoading(false);
      }
  }

  function handleCancelQuit() {
      setShowQuitModal(false);
  }

  function getClusterPersona(clusterId: number): Persona {
    if (clusterId in LearnerPersonas) {
        return LearnerPersonas[clusterId];
    }
    return {
      title: "General Learner",
      description: "Insufficient data from this session, or no clear learner profile has been formed yet.",
      encouragement: "Keep going! Every attempt is a cornerstone of progress. We look forward to your next session to continue exploring and learning SQL!"
  };
  }

  // Get the current learner persona info
  const currentPersona = getClusterPersona(finalClusterId === null ? -1 : finalClusterId);

  return (
    <div className="tutor-bg">
      <h1 className="tutor-title">Adaptive SQL Learning Feedback System</h1>
      <div className="tutor-container">
        <div className="tutor-card query-card">
          <h2 className="section-title">Enter Your SQL Query</h2>
          <textarea
            className="sql-input"
            placeholder="e.g., SELECT * FROM Employees;"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={locked || loading}
          />

          <div className="button-row">
            <button
              className="btn-submit"
              onClick={handleSubmit}
              disabled={locked || loading || !query.trim()}
            >
              {loading ? 'Submitting...' : 'Submit Query'}
            </button>

            <button
              className="btn-retry"
              onClick={handleRetry}
              disabled={!locked || loading}
            >
              Retry
            </button>

            <button className="btn-quit" onClick={handleQuit} disabled={loading}>
              Quit
            </button>
          </div>
        </div>

        {result && (
          <div className="tutor-card combined-card">
            
            <h2 className="combined-title">Results</h2>

            <p className="field"><strong>Error Type:</strong> {result.error_type}</p>
            <p className="field"><strong>Error Subtype:</strong> {result.error_subtype}</p>

            <div className="divider"></div>

            <h2 className="combined-title">Feedback</h2>
            <p className="feedback-text">{result.personalized_feedback}</p>

          </div>
        )}
        </div>

    {/* Quit Confirmation Modal */}
    {showQuitModal && (
      <div className="modal-overlay">
        <div className="modal-content">
          <h3 className="modal-title">End Session</h3>
          
          <p className="modal-message">
              Are you sure you want to end this learning session?<br/>
              Your learner profile will be assessed and displayed after you quit.
          </p>

          <div className="modal-actions">
            <button 
              className="btn-quit" 
              onClick={confirmQuit}
              disabled={loading}
            >
              Confirm Quit and View Learner Profile
            </button>
            <button 
              className="btn-cancel" 
              onClick={handleCancelQuit}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
    
    
    {/* Final Cluster Result Modal: Only shown after finalClusterId is set successfully */}
    {finalClusterId !== null && finalClusterId !== -2 && !showQuitModal && (
      <div className="modal-overlay">
        <div className="modal-content">
          <h3 className="modal-title">Learning Session Summary</h3>
          
          <p className="modal-cluster">
              The system observes your learning style trends toward:<br/> 
              <strong>{currentPersona.title}</strong>
          </p>
          <p className="modal-message">
              {currentPersona.description}
          </p>
          <p className="modal-encouragement">
              <span style={{ fontWeight: 600, color: '#4ade80' }}>Learning Insight:</span> {currentPersona.encouragement}
          </p>

          <div className="modal-actions">
            <button 
              className="btn-quit" 
              onClick={() => {
                  setFinalClusterId(null);
                  // Navigate back to home/login after dismissal
                  sessionStorage.removeItem('username')
                  sessionStorage.removeItem('session_id')
                  nav('/'); 
              }} 
              disabled={loading}
            >
              Got It
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Session End Failed Modal */}
    {finalClusterId === -2 && !showQuitModal && (
      <div className="modal-overlay">
        <div className="modal-content">
          <h3 className="modal-title">Session End Failed</h3>
          <p className="modal-message">
              An error occurred while ending the session. Your learner profile could not be generated. Please try again later.
          </p>
          <div className="modal-actions">
            <button 
              className="btn-quit" 
              onClick={() => {
                  setFinalClusterId(null);
                  // Navigate back to home/login after dismissal
                  sessionStorage.removeItem('username')
                  sessionStorage.removeItem('session_id')
                  nav('/'); 
              }} 
            >
              Close
            </button>
          </div>
        </div>
      </div>
  
    )}

    {/* --- Database Schema Button --- */}
    <div className="schema-button-container">
      <button className="schema-btn" onClick={() => setShowSchema(true)}>
        View Database Schema
      </button>
    </div>

    {/* --- Database Schema Modal --- */}
    {showSchema && (
      <div className="modal-overlay" onClick={() => setShowSchema(false)}>
        <div className="schema-modal" onClick={(e) => e.stopPropagation()}>
          <span className="modal-close" onClick={() => setShowSchema(false)}>
          ✕
          </span>
          <h3 className="modal-title">Database Schema Diagram</h3>

          <img src={diagram} alt="Database Schema" className="schema-img" />
        </div>
      </div>
    )}
    </div>
  )
}

  