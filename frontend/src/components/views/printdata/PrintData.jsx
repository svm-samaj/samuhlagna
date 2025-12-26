import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ReceiptManagement.css';

const PrintData = () => {
  const navigate = useNavigate();

  const handleCardClick = (action) => {
    console.log(`${action} clicked`);
    
    switch (action) {
      case 'create-receipt':
        navigate('/create-receipt');
        break;
      case 'reports':
        navigate('/reports');
        break;
      case 'modify-receipt':
        navigate('/modify-receipt');
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  const receiptCards = [
    {
      id: 'create-receipt',
      title: 'Create Receipt',
      description: 'Generate new donation receipts for contributors',
      icon: '📝',
      action: 'create-receipt',
      color: '#4CAF50'
    },
    {
      id: 'reports',
      title: 'Reports',
      description: 'Generate and download receipt reports & summaries',
      icon: '📊',
      action: 'reports',
      color: '#9C27B0'
    },
    {
      id: 'modify-receipt',
      title: 'Modify Receipt',
      description: 'Edit and update existing receipt information',
      icon: '✏️',
      action: 'modify-receipt',
      color: '#FF9800'
    }
  ];

  return (
    <div className="receipt-management-container">
      <div className="receipt-header-2">
        <h1 className="receipt-title">Receipts</h1>
        <p className="receipt-subtitle">Create, modify and generate receipt reports</p>
      </div>
      
      <div className="receipt-cards-grid">
        {receiptCards.map((card) => (
          <div
            key={card.id}
            className="receipt-card"
            onClick={() => handleCardClick(card.action)}
            style={{ '--card-color': card.color }}
          >
            <div className="card-icon">{card.icon}</div>
            <h3 className="card-title">{card.title}</h3>
            <p className="card-description">{card.description}</p>
            <div className="card-action">
              <span>Click to access</span>
              <span className="arrow">→</span>
            </div>
          </div>
        ))}
      </div>


    </div>
  );
};

export default PrintData;
