import React from 'react';
import './SchemaCard.css';

export default function SchemaCard() {
  return (
    <div className="schema-card">
      <h2 className="schema-title">Database Schema</h2>

      <div className="schema-block">
        <h3 className="schema-section">Employees</h3>
        <div className="schema-list">
          Employee_ID(INT) PK<br />
          Name(TEXT)<br />
          Job_Role(TEXT)<br />
          Division(TEXT)<br />
          Last_Login_Time(DATE)
        </div>
      </div>

      <div className="schema-block">
        <h3 className="schema-section">Robots</h3>
        <div className="schema-list">
          Robot_ID(INT) PK<br />
          Employee_ID(INT) FK<br />
          Model(TEXT)<br />
          Manufacturing_Date(DATE)<br />
          Status(TEXT)<br />
          Last_Software_Update(DATE)
        </div>
      </div>

      <div className="schema-block">
        <h3 className="schema-section">Logs</h3>
        <div className="schema-list">
          Log_ID(INT) PK<br />
          Employee_ID(INT) FK<br />
          Robot_ID(INT) FK<br />
          Action_Description(TEXT)<br />
          Timestamp(DATE)
        </div>
      </div>

      <div className="schema-block">
        <h3 className="schema-section">Incidents</h3>
        <div className="schema-list">
          Incident_ID(INT) PK<br />
          Employee_ID(INT) FK<br />
          Robot_ID(INT) FK<br />
          Description(TEXT)<br />
          Timestamp(DATE)
        </div>
      </div>

      <div className="schema-block">
        <h3 className="schema-section">Access_Codes</h3>
        <div className="schema-list">
          Access_Code_ID(INT) PK<br />
          Employee_ID(INT) FK<br />
          Level_of_Access(TEXT)<br />
          Timestamp_of_Last_Use(DATE)
        </div>
      </div>
    </div>
  );
}

