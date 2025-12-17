import React from 'react';
import './QuestionCard.css';

interface QuestionCardProps {
  questionNumber: number;
  title: string;
  description: string;
  attempts: number;
  maxAttempts: number;
}

export default function QuestionCard({
  questionNumber,
  title,
  description,
  attempts,
  maxAttempts,
}: QuestionCardProps) {
  return (
    <div className="question-card">

      <div className="rules-section">
        <h3 className="rules-title">Practice Rules</h3>
        <p className="rules-text">
          You have <strong>{maxAttempts} attempts</strong> for each question.
          Every <strong>Submit</strong> counts as an attempt, whether right or wrong.
          You can <strong>Quit</strong> anytime to end this question.
          After solving, using all attempts, or quitting,
          your <strong>learner type</strong> will be shown.
        </p>
      </div>

      <div className="question-content">
        <h2 className="question-title">
          Question {questionNumber}: {title}
        </h2>
        <p className="question-description">{description}</p>
      </div>

      <div className="attempts-info">
        Attempts: {attempts} / {maxAttempts}
      </div>
    </div>
  );
}
