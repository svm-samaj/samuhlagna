import React from 'react';
import './Pagination.css';

const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange,
  className = ""
}) => {
  const handleFirstPage = () => {
    if (currentPage > 1) {
      onPageChange(1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handleLastPage = () => {
    if (currentPage < totalPages) {
      onPageChange(totalPages);
    }
  };

  // Don't render pagination if there's only one page or no pages
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={`pagination ${className}`}>
      <button 
        onClick={handleFirstPage} 
        disabled={currentPage <= 1}
        className="pagination-btn"
      >
        First
      </button>
      <button 
        onClick={handlePrevPage} 
        disabled={currentPage <= 1}
        className="pagination-btn"
      >
        Prev
      </button>
      <span className="pagination-info">
        Page {currentPage} of {totalPages}
      </span>
      <button 
        onClick={handleNextPage} 
        disabled={currentPage >= totalPages}
        className="pagination-btn"
      >
        Next
      </button>
      <button 
        onClick={handleLastPage} 
        disabled={currentPage >= totalPages}
        className="pagination-btn"
      >
        Last
      </button>
    </div>
  );
};

export default Pagination;
