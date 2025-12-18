import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.ts';
import { useTypingCapture } from '../hooks/useTypingCapture.ts';
import './SQLTutor.css';
import QuestionCard from '../components/QuestionCard.tsx';
import SchemaCard from '../components/SchemaCard.tsx';
import { db } from './../firebase/setup.ts';
import { collection, getDocs } from 'firebase/firestore';

interface ResultType {
  error_type: string;
  error_subtype: string;
  personalized_feedback: string;
  is_correct: boolean;
  question_cluster_id?: number | null;
}

interface Persona {
  title: string;
  description: string;
  encouragement: string;
}

interface Question {
  task_id: number;
  title: string;
  description: string;
  solution: string;
}

// Learner profile information based on clusters 0, 1, 2, 3, 4
const LearnerPersonas: Record<number, Persona> = {
  // Cluster 3 - Proficient Learner
  3: {
      title: "Proficient Learner",
      description: "Your data suggests: very fast typing speed, minimal key-flight time, and the fewest retries.",
      encouragement: "Excellent! Your learning efficiency is impressive. Keep up this fast and precise pace; you are efficiently building a strong skill foundation!"
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

function getPersona(clusterId?: number | null): Persona {
  if (clusterId != null && clusterId in LearnerPersonas) {
    return LearnerPersonas[clusterId];
  }
  return {
    title: "General Learner",
    description: "Insufficient data from this question, or no clear learner profile has been formed yet.",
    encouragement: "Keep going! Every attempt is a cornerstone of progress. We look forward to your next question to continue exploring and learning SQL!"
  };
}

function normalizeSQL(sql: string): string {
  return sql
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*([(),;])\s*/g, '$1')
    .toUpperCase();
}

const MAX_ATTEMPTS = 4;

type PityReason = 'max_attempts' | 'quit' | null;

export default function SQLTutor() {
  const nav = useNavigate();
  const username = sessionStorage.getItem('username') || '';
  const session_id = sessionStorage.getItem('session_id') || '';

  const [query, setQuery] = useState('');
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState<ResultType | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [completedQuestions, setCompletedQuestions] = useState<Set<number>>(
    new Set()
  );
  const [currentIndex, setCurrentIndex] = useState(0);

  const [attemptsMap, setAttemptsMap] = useState<Record<number, number>>({});

  // Modals
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPityModal, setShowPityModal] = useState(false);
  const [showAllDoneModal, setShowAllDoneModal] = useState(false);

  const [currentQuestionClusterId, setCurrentQuestionClusterId] = useState<
    number | null
  >(null);

  const { events, reset } = useTypingCapture(!locked);
  const [pityReason, setPityReason] = useState<PityReason>(null);
  const [pitySolution, setPitySolution] = useState<string | null>(null);

  /** Load questions from Firestore */
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, 'questions'));
      const list: Question[] = snap.docs
        .map((d) => ({
          task_id: Number(d.id ?? d.data().task_id),
          title: d.data().title,
          description: d.data().description,
          solution: d.data().solution,
        }))
        .sort((a, b) => a.task_id - b.task_id);

      setQuestions(list);
      
      const init: Record<number, number> = {};
      list.forEach((q) => (init[q.task_id] = 0));
      setAttemptsMap(init);
    })().catch((e) => console.error('Load questions failed:', e));
  }, []);

  /** Guard: missing session */
  useEffect(() => {
    if (!username || !session_id) nav('/');
  }, [username, session_id, nav]);

  /** Derive availableQuestions */
  const availableQuestions = useMemo(
    () => questions.filter((q) => !completedQuestions.has(q.task_id)),
    [questions, completedQuestions]
  );

  /** Keep currentIndex in range */
  useEffect(() => {
    if (availableQuestions.length > 0 && currentIndex >= availableQuestions.length) {
      console.log('[EFFECT] Correcting currentIndex to 0');
      setCurrentIndex(0);
    }
  }, [availableQuestions.length, currentIndex]);

  const currentQuestion =
    availableQuestions.length > 0
      ? availableQuestions[Math.max(0, Math.min(currentIndex, availableQuestions.length - 1))]
      : null;

  const currentAttempts = currentQuestion
    ? attemptsMap[currentQuestion.task_id] ?? 0
    : 0;

  function gotoNextAvailable() {
    // clear states
    setCurrentQuestionClusterId(null);
    setLocked(false);
    setLoading(false);
    setQuery('');
    setResult(null);
    reset(); 
    setPityReason(null);
    setPitySolution(null);
    
    // close modals
    setShowSuccessModal(false);
    setShowPityModal(false);
    
    // check for next question after a short delay
    setTimeout(() => {
        if (availableQuestions.length === 0) {
            console.log('[GOTO] All questions completed! Showing All Done Modal');
            setShowAllDoneModal(true);
        } else {
            console.log('[GOTO] Moving to next question, setting index to 0');
            setCurrentIndex(0);
        }
    }, 150); 
  }
 
  /** Attempt counter helpers */
  function bumpAttempts(taskId: number) {
    setAttemptsMap((prev) => ({
      ...prev,
      [taskId]: (prev[taskId] ?? 0) + 1,
    }));
  }

  function markCompleted(taskId: number) {
    setCompletedQuestions((prev) => new Set([...prev, taskId]));
  }

  /** Submit */
  async function handleSubmit() {
    if (!currentQuestion || !query.trim() || loading || locked) return;

    setLocked(true);
    setLoading(true);
  
    const isCorrect = normalizeSQL(query) === normalizeSQL(currentQuestion.solution);
    const questionId = currentQuestion.task_id; 
  
    try {
      const res = await api.post('/submit_query', {
        username,
        session_id,
        task_id: questionId,
        query,
        events,
        is_correct: isCorrect,
      });
  
      const feedback = res.data as ResultType;
    
      // add attempt
      bumpAttempts(questionId);
      const nextAttempts = (attemptsMap[questionId] ?? 0) + 1;
  
      // Case A: Correct answer
      if (isCorrect) {
        console.log('[SUBMIT] Answer correct!');
        setResult(null);
  
        try {
          const endRes = await api.post('/end_question', {
            session_id,
            task_id: questionId,
            reason: 'correct'
          });
  
          console.log('[END_QUESTION] Cluster:', endRes.data.question_cluster_id);
          setCurrentQuestionClusterId(endRes.data.question_cluster_id ?? null);
        } catch (err) {
          console.error('[END_QUESTION] Failed:', err);
          setCurrentQuestionClusterId(null);
        }
  
        // mark completed
        markCompleted(questionId);
        
        // show success modal
        setShowSuccessModal(true);
        
        setLocked(true);
        setLoading(false);
        return;
      }
  
      // Case B: Incorrect but attempts remain
      if (!isCorrect && nextAttempts < MAX_ATTEMPTS) {
    
        setResult({
          error_type: feedback.error_type || "UNKNOWN",
          error_subtype: feedback.error_subtype || "UNKNOWN",
          personalized_feedback: feedback.personalized_feedback || "Please try again.",
          is_correct: false,
        });
  
        setCurrentQuestionClusterId(null);
        setLocked(true);
        setLoading(false);
        return;
      }
  
      // Case C: Incorrect and max attempts reached
      if (!isCorrect && nextAttempts >= MAX_ATTEMPTS) {
        setResult(null);
  
        try {
          const endRes = await api.post('/end_question', {
            session_id,
            task_id: questionId,
            reason: 'max_attempts'
          });
  
          setCurrentQuestionClusterId(endRes.data.question_cluster_id ?? null);
        } catch (err) {
          console.error('[END_QUESTION] Failed:', err);
          setCurrentQuestionClusterId(null);
        }

        
        setPityReason('max_attempts');
        setPitySolution(currentQuestion.solution);
        markCompleted(questionId);
        // show pity modal
        setShowPityModal(true);
        
        setLocked(true);
        setLoading(false);
        return;
      }
      
    } catch (err) {
      console.error('[SUBMIT] Error:', err);
      setResult({
        is_correct: false,
        error_type: 'API_ERROR',
        error_subtype: 'NETWORK_ERROR',
        personalized_feedback: 'Network error, please retry.',
      });
  
      setLocked(false);
      setLoading(false);
    } finally {
      reset();
    }
}
 
  /** Retry */
  function handleRetry() {
    if (loading) return;
    setLocked(false);
    setQuery('');
    setResult(null);
    setCurrentQuestionClusterId(null);
    reset();
}

  /** Quit */
  function handleQuit() {
    if (loading || !currentQuestion) return;
    setShowQuitModal(true);
  }

  async function confirmQuit() {
    if (!currentQuestion) return;

    const completedTaskId = currentQuestion.task_id; 

    setShowQuitModal(false);
    setLoading(true);

    try {
        const res = await api.post('/end_question', { 
            session_id, 
            task_id: completedTaskId,
            reason: 'quit'
        });
        
        const payload = res?.data ?? {};
        setCurrentQuestionClusterId(payload.question_cluster_id ?? null);
        
    } catch (e) {
        console.warn('[end_question] failed:', e);
        setCurrentQuestionClusterId(null);
    } finally {
        markCompleted(completedTaskId);
        setPityReason('quit');
        setShowPityModal(true); 
        setLoading(false);
    }
  }

  function cancelQuit() {
    setShowQuitModal(false);
  }

  /** All done Exit */
  async function handleAllDoneExit() {
    try {
      await api.post('/end_session', { session_id });
    } catch (e) {
      console.error('end_session failed:', e);
    } finally {
      sessionStorage.removeItem('username');
      sessionStorage.removeItem('session_id');
      nav('/');
    }
  }
  
  /** Render guards */
  if (questions.length === 0) {
    return <div>Loading questions...</div>;
  }

  /** Personas */
  const persona = getPersona(currentQuestionClusterId);

  return (
    <div className="tutor-bg">
      <h1 className="tutor-title">Adaptive SQL Learning Feedback System</h1>

      <div className="tutor-container">
        <div className="top-row">
          {/* LEFT: Database Schema */}
          <div className="sidebar-schema scrollable-sidebar">
            <SchemaCard />
          </div>

          <div className="main-content-area">
            <div className="question-query-row">
              {/* Middle: Question + Rules */}
              <div className="card question-wrapper">
                {currentQuestion ? (
                  <QuestionCard
                    questionNumber={
                      questions.findIndex((q) => q.task_id === currentQuestion.task_id) + 1
                    }
                    title={currentQuestion.title}
                    description={currentQuestion.description}
                    attempts={currentAttempts}
                    maxAttempts={MAX_ATTEMPTS}
                  />
                ) : (
                  <div style={{ padding: 16 }}>No more questions.</div>
                )}
                </div>
                {/* Right: Query input */}
                <div className="tutor-card query-card">
                  <h2 className="section-title">Enter Your SQL Query</h2>
                  <textarea
                    className="sql-input"
                    placeholder="e.g., SELECT * FROM Employees;"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={locked || loading || !currentQuestion}
                  />

                  <div className="button-row">
                    <button
                      className="btn-submit"
                      onClick={handleSubmit}
                      disabled={locked || loading || !query.trim() || !currentQuestion}
                    >
                    {loading ? 'Submitting...' : 'Submit'}
                    </button>

                    <button className="btn-retry" onClick={handleRetry} disabled={loading || !currentQuestion}>
                      Retry
                    </button>

                    <button className="btn-quit" onClick={handleQuit} disabled={loading || !currentQuestion}>
                      Quit
                    </button>
                  </div>
                  <p className="query-hint">
                  Once you submit your query, the editor will be locked to prevent accidental changes. 
                  Click <strong>Retry</strong> to make another attempt.
                  </p>
                </div>
                </div>

                {/* Feedback */}
                {result && !showSuccessModal && !showPityModal && (
                  <div className="feedback-card">
                    <h2 className="combined-title">Results</h2>
                    <p className="field">
                      <strong>Error Type:</strong> {result.error_type}
                    </p>
                    <p className="field">
                      <strong>Error Subtype:</strong> {result.error_subtype}
                    </p>

                    <div className="divider"></div>

                    <h2 className="combined-title">Feedback</h2>
                    <p className="feedback-text">{result.personalized_feedback}</p>

                  </div>
                )}
            </div>
          </div>
      </div>

      {/* Quit Confirmation Modal */}
      {showQuitModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">End This Question</h3>
            <p className="modal-message">
              Quit will end this question now and we’ll show your learner type
              based on your current typing data. Continue?
            </p>
            <div className="modal-actions">
              <button className="btn-quit" onClick={confirmQuit} disabled={loading}>
                Quit & View Learner Type
              </button>
              <button className="btn-cancel" onClick={cancelQuit} disabled={loading}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title" style={{ color: '#4ade80' }}>
              🎉 Correct!
            </h3>
            <p className="modal-cluster">
              Your learner type for this question:<br />
              <strong>{persona.title}</strong>
            </p>
            <p className="modal-message">{persona.description}</p>
            <p className="modal-encouragement">{persona.encouragement}</p>

            <div className="modal-actions">
              <button
                className="btn-submit"
                onClick={() => {
                    gotoNextAvailable();          
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pity Modal */}
      {showPityModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            {pityReason === 'max_attempts' ? (
              <>
              <h3 className="modal-title" style={{ color: '#f87171' }}>
              Out of Attempts
              </h3>

              <p >
                <strong>The correct answer is:</strong>
              </p>

              <pre className="correct-answer-box">
                {pitySolution}
              </pre>

              <p className="modal-cluster">
                Your learner type for this question:
                <br />
                <strong>{persona.title}</strong>
              </p>

              <p className="modal-message">{persona.description}</p>
              <p className="modal-encouragement">{persona.encouragement}</p>
    
              <div className="modal-actions">
                <button className="btn-submit" onClick={gotoNextAvailable}>
                  Next Question
                </button>
              </div>
            </>
            ) : (
              <>
              <h3 className="modal-title">Keep Going!</h3>

              <p className="modal-message">
                This question is now complete. Here’s your learner insight:
              </p>

              <p className="modal-cluster">
                <strong>{persona.title}</strong>
              </p>

              <p className="modal-message">{persona.description}</p>
              <p className="modal-encouragement">{persona.encouragement}</p>

              <div className="modal-actions">
                <button className="btn-submit" onClick={gotoNextAvailable}>
                  Next Question
                </button>
              </div>
            </>
            )}

          </div>
        </div>
      )}

      {/* All Done Modal */}
      {showAllDoneModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">🎉 All Questions Completed!</h3>
            <p>You’ve finished all questions. Great work!</p>

            <div className="modal-actions">
              <button className="btn-submit" onClick={handleAllDoneExit}>
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
